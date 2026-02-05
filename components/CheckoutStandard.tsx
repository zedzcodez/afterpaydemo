"use client";

/**
 * Standard Checkout Component
 *
 * Supports two checkout modes:
 * 1. Redirect: Customer is redirected to Afterpay, then back to merchant site
 * 2. Popup: Afterpay opens in a popup window, customer stays on merchant site
 *
 * IMPORTANT - Popup Mode Requirements:
 * - The popupOriginUrl in the checkout request MUST exactly match window.location.origin
 * - If protocol, host, or port don't match, the browser won't dispatch the onComplete event
 * - This causes the popup to appear to "cancel" even when the customer completes checkout
 * - Ensure NEXT_PUBLIC_APP_URL in .env.local matches where the app is actually running
 *
 * See: https://developers.afterpay.com/afterpay-online/reference/popup-method
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/products";
import { OSMPlacement } from "./OSMPlacement";
import { CodeViewer } from "./CodeViewer";
import { getCartSkus, getCartCategories } from "@/lib/cart";
import { initFlowLogs, addFlowLog, logCallback, setFlowSummary, updateFlowSummary, FlowSummary } from "@/lib/flowLogs";
import { toggleDevPanel, useDevPanelState } from "./FlowLogsDevPanel";

type CheckoutMode = "redirect" | "popup";

interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
}

interface CheckoutStandardProps {
  onLog?: (method: string, endpoint: string, request?: object) => string;
  onLogUpdate?: (
    id: string,
    update: { response?: object; status?: number; error?: string }
  ) => void;
  onShippingChange?: (option: ShippingOption) => void;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

// Flow summary definitions
const FLOW_SUMMARIES: Record<string, Omit<FlowSummary, 'requestConfig' | 'responseData'>> = {
  'standard': {
    flow: 'standard-redirect',
    description: 'Full-page redirect to Afterpay where customer completes checkout, then returns to merchant site via redirectConfirmUrl for payment authorization.',
    steps: ['Create Checkout', 'Redirect to Afterpay', 'Customer Returns', 'Authorize Payment'],
    docsUrl: 'https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart',
  },
  'standard-popup': {
    flow: 'standard-popup',
    description: 'Modal popup checkout using Afterpay.js where customer stays on merchant site. Payment is authorized via the onComplete callback.',
    steps: ['Create Checkout', 'Open Afterpay Popup', 'Authorize Payment'],
    docsUrl: 'https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method',
  },
};

const FREE_SHIPPING_THRESHOLD = 100;

const getShippingOptions = (cartTotal: number): ShippingOption[] => {
  const options: ShippingOption[] = [
    { id: "standard", name: "Standard Shipping", description: "5-7 business days", price: 5.99 },
    { id: "express", name: "Express Shipping", description: "2-3 business days", price: 12.99 },
    { id: "overnight", name: "Overnight Shipping", description: "Next business day", price: 24.99 },
  ];

  // Add free shipping for orders over threshold
  if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
    options.unshift({
      id: "free",
      name: "Free Shipping",
      description: `5-7 business days • Orders over $${FREE_SHIPPING_THRESHOLD}`,
      price: 0,
    });
  }

  return options;
};

export function CheckoutStandard({ onLog, onLogUpdate, onShippingChange }: CheckoutStandardProps) {
  const router = useRouter();
  const { items, total } = useCart();
  const isDevPanelOpen = useDevPanelState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("redirect");
  const [isAfterpayReady, setIsAfterpayReady] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
  });

  // Compute shipping options based on cart total (includes free shipping for orders >= $100)
  const shippingOptions = getShippingOptions(total);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption>(shippingOptions[0]);

  const finalTotal = total + selectedShipping.price;

  // Handle shipping selection change
  const handleShippingSelect = (option: ShippingOption) => {
    setSelectedShipping(option);
    onShippingChange?.(option);
  };

  // Auto-select first shipping option on mount and when options change
  useEffect(() => {
    const options = getShippingOptions(total);
    if (options.length > 0) {
      setSelectedShipping(options[0]);
      onShippingChange?.(options[0]);
    }
  }, [total, onShippingChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Check if Afterpay.js is loaded
  useEffect(() => {
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay) {
        setIsAfterpayReady(true);
      } else {
        setTimeout(checkAfterpay, 100);
      }
    };
    checkAfterpay();
  }, []);

  // Create the onComplete handler function for popup mode
  const createOnCompleteHandler = useCallback(() => {
    return async (event: { data: { status: string; orderToken: string } }) => {
      logCallback("AfterPay.onComplete", { status: event.data.status });

      if (event.data.status === "SUCCESS") {
        addFlowLog({
          type: "callback",
          label: "Customer completed Afterpay checkout",
          data: { status: "SUCCESS", orderToken: event.data.orderToken.substring(0, 20) + "..." },
        });

        // Check capture mode from localStorage
        const captureMode = localStorage.getItem("afterpay_capture_mode") || "deferred";
        const isImmediateCapture = captureMode === "immediate";

        try {
          let orderId: string;

          if (isImmediateCapture) {
            // Immediate Capture Mode: Use Capture Full Payment API (combines auth + capture)
            const captureFullClientRequest = { token: event.data.orderToken };

            const startTime = Date.now();
            const response = await fetch("/api/afterpay/capture-full", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(captureFullClientRequest),
            });

            const data = await response.json();
            const duration = Date.now() - startTime;

            // Log request with FULL server-side payload from _meta
            addFlowLog({
              type: "api_request",
              label: "Capture Full Payment (Immediate Mode)",
              method: "POST",
              endpoint: "/api/afterpay/capture-full → /v2/payments/capture",
              data: data._meta?.requestBody || captureFullClientRequest,
              fullUrl: data._meta?.fullUrl,
              headers: data._meta?.headers,
            });

            addFlowLog({
              type: "api_response",
              label: "Capture Full Response",
              method: "POST",
              endpoint: "/v2/payments/capture",
              status: response.status,
              data: data,
              duration,
              fullUrl: data._meta?.fullUrl,
            });

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.status !== "APPROVED") {
              throw new Error("Payment was not approved");
            }

            // Update flow summary with capture response data
            updateFlowSummary({
              responseData: {
                'data.orderToken': event.data.orderToken,
                id: data.id,
                status: data.status,
                originalAmount: data.originalAmount,
                openToCaptureAmount: data.openToCapture,
              },
            });

            orderId = data.id;
          } else {
            // Deferred Capture Mode: Only authorize, capture later from Admin Panel
            const authClientRequest = { token: event.data.orderToken };

            const startTime = Date.now();
            const response = await fetch("/api/afterpay/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(authClientRequest),
            });

            const data = await response.json();
            const duration = Date.now() - startTime;

            // Log request with FULL server-side payload from _meta
            addFlowLog({
              type: "api_request",
              label: "Authorize Payment (Deferred Mode)",
              method: "POST",
              endpoint: "/api/afterpay/auth → /v2/payments/auth",
              data: data._meta?.requestBody || authClientRequest,
              fullUrl: data._meta?.fullUrl,
              headers: data._meta?.headers,
            });

            addFlowLog({
              type: "api_response",
              label: "Authorization Response",
              method: "POST",
              endpoint: "/v2/payments/auth",
              status: response.status,
              data: data,
              duration,
              fullUrl: data._meta?.fullUrl,
            });

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.status !== "APPROVED") {
              throw new Error("Payment was not approved");
            }

            // Update flow summary with auth response data
            updateFlowSummary({
              responseData: {
                'data.orderToken': event.data.orderToken,
                id: data.id,
                status: data.status,
                originalAmount: data.originalAmount,
                openToCaptureAmount: data.openToCapture,
              },
            });

            orderId = data.id;
          }

          // Cart will be cleared on confirmation page after order is saved
          const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
          addFlowLog({
            type: "redirect",
            label: "Redirect to Confirmation",
            endpoint: `/confirmation?orderId=${orderId}&status=success&flow=standard-popup-${flowSuffix}`,
          });

          router.push(`/confirmation?orderId=${orderId}&status=success&flow=standard-popup-${flowSuffix}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment processing failed");
          setIsLoading(false);
        }
      } else {
        addFlowLog({
          type: "callback",
          label: "Customer cancelled Afterpay checkout",
          data: { status: event.data.status },
        });
        setError("Checkout was cancelled");
        setIsLoading(false);
      }
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Initialize flow logs for standard checkout
    const flowType = checkoutMode === "popup" ? "standard-popup" : "standard";
    initFlowLogs(flowType);

    // Initialize flow summary with base info
    const baseSummary = FLOW_SUMMARIES[flowType];
    setFlowSummary({
      ...baseSummary,
      requestConfig: {},
      responseData: {},
    });

    // For popup mode: open popup IMMEDIATELY (synchronously) to avoid popup blockers
    // The checkout will be created while the spinner shows, then token transferred
    if (checkoutMode === "popup" && window.Afterpay) {
      addFlowLog({
        type: "callback",
        label: "Initialize Afterpay (popup mode)",
        data: { countryCode: "US" },
      });

      window.Afterpay.initialize({ countryCode: "US" });

      addFlowLog({
        type: "callback",
        label: "Open popup (must be synchronous in click handler)",
        data: {},
      });

      window.Afterpay.open();

      addFlowLog({
        type: "callback",
        label: "Register onComplete handler",
        data: {},
      });

      window.Afterpay.onComplete = createOnCompleteHandler();
    }

    try {
      // Step 1: Create checkout
      const checkoutClientRequest = {
        items,
        total: finalTotal,
        mode: "standard",
        consumer: {
          givenNames: formData.firstName,
          surname: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phone,
        },
        shipping: {
          name: `${formData.firstName} ${formData.lastName}`,
          line1: formData.address1,
          line2: formData.address2,
          area1: formData.city,
          area2: formData.state,
          postcode: formData.postcode,
          countryCode: formData.country,
          phoneNumber: formData.phone,
        },
      };

      const logId = onLog?.("POST", "/api/afterpay/checkout", checkoutClientRequest);

      const startTime = Date.now();
      const response = await fetch("/api/afterpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutClientRequest),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      onLogUpdate?.(logId!, { response: data, status: response.status });

      // Log request with FULL server-side payload from _meta (includes merchantReference, merchant URLs, etc.)
      addFlowLog({
        type: "api_request",
        label: "Create Checkout",
        method: "POST",
        endpoint: "/api/afterpay/checkout → /v2/checkouts",
        data: data._meta?.requestBody || checkoutClientRequest,
        fullUrl: data._meta?.fullUrl,
        headers: data._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: "Checkout Created",
        method: "POST",
        endpoint: "/v2/checkouts",
        status: response.status,
        data: data,
        duration,
        fullUrl: data._meta?.fullUrl,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract request config from _meta for flow summary
      const serverRequestBody = data._meta?.requestBody;
      if (serverRequestBody) {
        updateFlowSummary({
          requestConfig: {
            'merchant.redirectConfirmUrl': serverRequestBody.merchant?.redirectConfirmUrl,
            'merchant.redirectCancelUrl': serverRequestBody.merchant?.redirectCancelUrl,
            'merchant.popupOriginUrl': serverRequestBody.merchant?.popupOriginUrl,
          },
          responseData: {
            token: data.token,
            redirectCheckoutUrl: data.redirectCheckoutUrl,
          },
        });
      }

      // Step 2: Open Afterpay (redirect or popup)
      if (checkoutMode === "redirect") {
        addFlowLog({
          type: "redirect",
          label: "Redirect to Afterpay",
          endpoint: data.redirectCheckoutUrl,
        });

        window.location.href = data.redirectCheckoutUrl;
      } else {
        // Popup mode - popup is already open (opened synchronously at start of handleSubmit)
        // Now just transfer the token
        if (!window.Afterpay) {
          throw new Error("Afterpay.js not loaded");
        }

        addFlowLog({
          type: "callback",
          label: "Transfer token to popup",
          data: { token: data.token.substring(0, 20) + "..." },
        });

        window.Afterpay.transfer({ token: data.token });
        // The rest happens in onComplete callback
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsLoading(false);
    }
  };

  const standardCode = `
// Standard Checkout - Server-Side API Flow

// Step 1: Create Checkout (Server)
const response = await fetch('https://global-api-sandbox.afterpay.com/v2/checkouts', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(MERCHANT_ID + ':' + SECRET_KEY),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' },
    consumer: {
      givenNames: 'John',
      surname: 'Doe',
      email: 'john@example.com'
    },
    merchant: {
      redirectConfirmUrl: 'https://yoursite.com/confirmation',
      redirectCancelUrl: 'https://yoursite.com/checkout'
    }
  })
});

const { token, redirectCheckoutUrl } = await response.json();

// Step 2: Redirect customer to Afterpay
window.location.href = redirectCheckoutUrl;

// Step 3: After customer confirms, authorize payment
const authResponse = await fetch('/v2/payments/auth', {
  method: 'POST',
  body: JSON.stringify({ token })
});

const { id: orderId, status } = await authResponse.json();

// Step 4: Capture payment (can be deferred up to 13 days)
const captureResponse = await fetch('/v2/payments/' + orderId + '/capture', {
  method: 'POST',
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' }
  })
});`;

  const popupCode = `
// Standard Checkout - Popup Flow (Afterpay.js)

// Step 1: Create Checkout (Server)
const response = await fetch('/api/afterpay/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' },
    consumer: { givenNames: 'John', surname: 'Doe', email: 'john@example.com' },
    merchant: {
      redirectConfirmUrl: 'https://yoursite.com/confirmation',
      redirectCancelUrl: 'https://yoursite.com/checkout'
    }
  })
});

const { token } = await response.json();

// Step 2: Initialize Afterpay.js
Afterpay.initialize({ countryCode: 'US' });

// Step 3: Set up completion handler
Afterpay.onComplete = async (event) => {
  if (event.data.status === 'SUCCESS') {
    // Authorize payment
    const authResponse = await fetch('/api/afterpay/auth', {
      method: 'POST',
      body: JSON.stringify({ token: event.data.orderToken })
    });
    const { id: orderId } = await authResponse.json();

    // Capture payment
    await fetch('/api/afterpay/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount: ${finalTotal.toFixed(2)} })
    });
  }
};

// Step 4: Open popup and transfer token
Afterpay.open();
Afterpay.transfer({ token });`;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Checkout Mode Toggle */}
        <div>
          <label className="block text-sm font-medium mb-3">Checkout Method</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCheckoutMode("redirect")}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                checkoutMode === "redirect"
                  ? "border-afterpay-mint bg-afterpay-mint/10"
                  : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
              }`}
            >
              <span className="block font-medium">Redirect</span>
              <span className="block text-xs text-afterpay-gray-500">
                Full page navigation
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCheckoutMode("popup")}
              disabled={!isAfterpayReady}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                checkoutMode === "popup"
                  ? "border-afterpay-mint bg-afterpay-mint/10"
                  : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
              } ${!isAfterpayReady ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="block font-medium">Popup</span>
              <span className="block text-xs text-afterpay-gray-500">
                Modal overlay
              </span>
            </button>
          </div>
        </div>

        {/* Mode Description */}
        <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 text-sm">
          {checkoutMode === "redirect" ? (
            <>
              <p className="font-medium mb-2">Redirect Flow</p>
              <p className="text-afterpay-gray-600">
                Customer is redirected to Afterpay&apos;s checkout page. After completing
                the checkout, they return to your review page where you can authorize
                and capture the payment.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium mb-2">Popup Flow</p>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                Uses Afterpay.js to open a modal popup. Customer completes checkout
                without leaving your site. Payment is authorized and captured via
                the <code className="bg-afterpay-gray-200 dark:bg-afterpay-gray-700 px-1.5 py-0.5 rounded text-afterpay-black dark:text-afterpay-mint font-mono text-xs">onComplete</code> callback.
              </p>
            </>
          )}
        </div>

        {/* Developer Tools Section */}
        <div className="space-y-3">
          {/* Developer Panel Toggle */}
          <div className="flex items-center justify-between p-3 bg-afterpay-gray-100 dark:bg-afterpay-gray-800 rounded-lg">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-afterpay-black dark:text-white">Developer Panel</p>
              <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">
                View API requests, responses, and integration flow logs
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleDevPanel(25)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDevPanelOpen
                  ? "bg-afterpay-mint text-afterpay-black hover:bg-afterpay-mint-dark"
                  : "bg-afterpay-gray-800 dark:bg-afterpay-gray-700 text-white hover:bg-afterpay-gray-700 dark:hover:bg-afterpay-gray-600"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {isDevPanelOpen ? "Hide Developer Panel" : "Show Developer Panel"}
            </button>
          </div>

          {/* Code Viewer */}
          <CodeViewer
            title={`View ${checkoutMode === "redirect" ? "Redirect" : "Popup"} Checkout Code`}
            code={checkoutMode === "redirect" ? standardCode : popupCode}
          />
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="font-medium mb-4">Contact Information</h3>
          <div className="space-y-4">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email address"
              required
              className="input-styled"
            />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone number"
              className="input-styled"
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div>
          <h3 className="font-medium mb-4">Shipping Address</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First name"
                required
                className="input-styled"
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Last name"
                required
                className="input-styled"
              />
            </div>
            <input
              type="text"
              name="address1"
              value={formData.address1}
              onChange={handleInputChange}
              placeholder="Address"
              required
              className="input-styled"
            />
            <input
              type="text"
              name="address2"
              value={formData.address2}
              onChange={handleInputChange}
              placeholder="Apartment, suite, etc. (optional)"
              className="input-styled"
            />
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                required
                className="input-styled"
              />
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="State"
                required
                className="input-styled"
              />
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleInputChange}
                placeholder="ZIP code"
                required
                className="input-styled"
              />
            </div>
          </div>
        </div>

        {/* Shipping Method */}
        <div>
          <h3 className="font-medium mb-4">Shipping Method</h3>
          <div className="space-y-2">
            {shippingOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedShipping.id === option.id
                    ? "border-afterpay-mint bg-afterpay-mint/10"
                    : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="shipping"
                    value={option.id}
                    checked={selectedShipping.id === option.id}
                    onChange={() => handleShippingSelect(option)}
                    className="radio-mint mr-3"
                  />
                  <div>
                    <span className="font-medium">{option.name}</span>
                    {option.description && (
                      <p className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-medium">
                  {option.price === 0 ? (
                    <span className="text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    formatPrice(option.price)
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>
                {selectedShipping.price === 0 ? (
                  <span className="text-green-600 dark:text-green-400">FREE</span>
                ) : (
                  formatPrice(selectedShipping.price)
                )}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-2">
              <span>Total</span>
              <span>{formatPrice(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button - Official Afterpay Asset */}
        <button
          type="submit"
          disabled={isLoading || items.length === 0}
          aria-label="Pay with Cash App Afterpay"
          className="w-full flex items-center justify-center bg-afterpay-black rounded-lg hover:bg-afterpay-gray-800 transition-colors py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2 py-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white font-medium">Processing...</span>
            </span>
          ) : (
            <img
              alt="Pay with Cash App Afterpay"
              aria-hidden="true"
              src="https://static.afterpaycdn.com/en-US/integration/button/pay-with-afterpay/color-on-black.svg"
              height="48"
              className="h-12"
            />
          )}
        </button>
      </form>
    </div>
  );
}
