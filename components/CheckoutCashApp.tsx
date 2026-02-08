"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/products";
import { initFlowLogs, addFlowLog, setFlowSummary, updateFlowSummary, FlowSummary } from "@/lib/flowLogs";
import { toggleDevPanel, useDevPanelState } from "./FlowLogsDevPanel";
import { CashAppPayCompleteEvent } from "@/lib/types";
import { CashAppInfoSection } from "./CashAppInfoSection";

interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
}

interface CheckoutCashAppProps {
  isActive?: boolean;
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

const FLOW_SUMMARY: Omit<FlowSummary, 'requestConfig' | 'responseData'> = {
  flow: 'cashapp',
  description: 'Cash App Pay checkout where customer scans a QR code or taps the Cash App Pay button to authorize payment via Cash App.',
  steps: ['Create Checkout', 'Initialize Cash App Pay', 'Customer Authorizes via Cash App', 'Authorize Payment'],
  docsUrl: 'https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview',
};

const FREE_SHIPPING_THRESHOLD = 100;

const getShippingOptions = (cartTotal: number): ShippingOption[] => {
  const options: ShippingOption[] = [
    { id: "standard", name: "Standard Shipping", description: "5-7 business days", price: 5.99 },
    { id: "express", name: "Express Shipping", description: "2-3 business days", price: 12.99 },
    { id: "overnight", name: "Overnight Shipping", description: "Next business day", price: 24.99 },
  ];

  if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
    options.unshift({
      id: "free",
      name: "Free Shipping",
      description: `5-7 business days \u2022 Orders over $${FREE_SHIPPING_THRESHOLD}`,
      price: 0,
    });
  }

  return options;
};

const CASH_APP_BUTTON_OPTIONS = {
  size: "medium" as const,
  width: "full" as const,
  theme: "dark" as const,
  shape: "semiround" as const,
};

export function CheckoutCashApp({ isActive, onShippingChange }: CheckoutCashAppProps) {
  const router = useRouter();
  const { items, total } = useCart();
  const isDevPanelOpen = useDevPanelState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
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

  // Compute shipping options based on cart total
  const shippingOptions = getShippingOptions(total);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption>(shippingOptions[0]);

  const finalTotal = total + selectedShipping.price;

  // Refs to keep current values accessible in callbacks
  const itemsRef = useRef(items);
  const totalRef = useRef(finalTotal);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    totalRef.current = finalTotal;
  }, [finalTotal]);

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

  // Restart Cash App Pay SDK: clears previous authorization and removes UI elements
  const restartCashAppPay = () => {
    if (window.Afterpay?.restartCashAppPay) {
      window.Afterpay.restartCashAppPay();
      addFlowLog({
        type: "callback",
        label: "Cash App Pay Restarted",
        data: { reason: "User returned to form or retrying" },
      });
    }
  };

  // Track whether SDK has been initialized (for logging context)
  const hasInitializedRef = useRef(false);

  // Store token for re-initialization when switching back to this tab
  const savedTokenRef = useRef<string | null>(null);

  // Refs to read current state inside isActive effect (avoids stale closures)
  const formSubmittedRef = useRef(formSubmitted);
  formSubmittedRef.current = formSubmitted;
  const showPaymentButtonRef = useRef(showPaymentButton);
  showPaymentButtonRef.current = showPaymentButton;
  const pendingTokenRef = useRef(pendingToken);
  pendingTokenRef.current = pendingToken;

  // Handle going back to edit form
  const handleEditClick = () => {
    restartCashAppPay();
    setFormSubmitted(false);
    setShowPaymentButton(false);
    setError(null);
    setPendingToken(null);
  };

  // Handle retry after error/decline
  const handleRetry = () => {
    restartCashAppPay();
    setFormSubmitted(false);
    setShowPaymentButton(false);
    setError(null);
    setPendingToken(null);
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Poll for SDK readiness (initializeForCashAppPay)
  useEffect(() => {
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay && typeof window.Afterpay.initializeForCashAppPay === 'function') {
        setIsReady(true);
      } else {
        setTimeout(checkAfterpay, 100);
      }
    };
    checkAfterpay();
  }, []);

  // SDK lifecycle: restart on deactivation, re-init on activation
  useEffect(() => {
    if (!isActive) {
      // Deactivating: restart SDK to clean up Cash App state
      if (formSubmittedRef.current && showPaymentButtonRef.current) {
        restartCashAppPay();
      }
      return;
    }
    // Activating: re-init SDK if we have a previously submitted checkout
    if (formSubmittedRef.current && showPaymentButtonRef.current && savedTokenRef.current && !pendingTokenRef.current) {
      setPendingToken(savedTokenRef.current);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup: restart Cash App Pay when component unmounts (SPA navigation)
  useEffect(() => {
    return () => {
      if (window.Afterpay?.restartCashAppPay) {
        window.Afterpay.restartCashAppPay();
      }
    };
  }, []);

  // Initialize Cash App Pay SDK after the button container is in the DOM
  useEffect(() => {
    if (!pendingToken || !showPaymentButton) return;

    // Wait for next frame to ensure the DOM has rendered the #cash-app-pay div
    const frameId = requestAnimationFrame(() => {
      if (!window.Afterpay || typeof window.Afterpay.initializeForCashAppPay !== 'function') {
        setError("Afterpay.js Cash App Pay SDK not loaded");
        setIsLoading(false);
        return;
      }

      // Always render button before init — SDK may have been restarted,
      // which removes all UI elements. This is safe to call even on first init.
      if (window.Afterpay.renderCashAppPayButton) {
        window.Afterpay.renderCashAppPayButton({
          countryCode: "US",
          cashAppPayButtonOptions: CASH_APP_BUTTON_OPTIONS,
        });
        addFlowLog({
          type: "callback",
          label: hasInitializedRef.current ? "Re-rendered Cash App Pay Button" : "Rendered Cash App Pay Button",
          data: { reason: hasInitializedRef.current ? "Button UI cleared by restart, re-rendering before init" : "First render" },
        });
      }

      addFlowLog({
        type: "callback",
        label: "Initialize Cash App Pay",
        data: { countryCode: "US", token: pendingToken.substring(0, 20) + "..." },
      });

      try {
        window.Afterpay.initializeForCashAppPay({
          countryCode: "US",
          token: pendingToken,
          cashAppPayOptions: {
            button: CASH_APP_BUTTON_OPTIONS,
            onComplete: handleComplete,
            eventListeners: {
              CUSTOMER_INTERACTION: (event: { isMobile: boolean }) => {
                addFlowLog({
                  type: "callback",
                  label: "Customer Interaction",
                  data: event,
                });
              },
              CUSTOMER_REQUEST_APPROVED: () => {
                addFlowLog({
                  type: "callback",
                  label: "Customer Request Approved",
                });
              },
              CUSTOMER_REQUEST_DECLINED: () => {
                addFlowLog({
                  type: "callback",
                  label: "Customer Request Declined",
                  data: { hint: "User can click Try Again to restart" },
                });
                setError("Payment was declined. Please try again.");
              },
              CUSTOMER_REQUEST_FAILED: () => {
                addFlowLog({
                  type: "callback",
                  label: "Customer Request Failed",
                  data: { hint: "User can click Try Again to restart" },
                });
                setError("Payment failed. Please try again.");
              },
              CUSTOMER_DISMISSED: () => {
                addFlowLog({
                  type: "callback",
                  label: "Customer Dismissed",
                });
              },
            },
          },
        });
        setIsLoading(false);
        hasInitializedRef.current = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "SDK initialization failed";
        // If re-init with saved token failed, the token may be expired — reset to form
        if (savedTokenRef.current) {
          savedTokenRef.current = null;
          setFormSubmitted(false);
          setShowPaymentButton(false);
          setError("Your checkout session expired. Please submit again.");
        } else {
          setError(msg);
        }
        setIsLoading(false);
      }

      savedTokenRef.current = pendingToken;
      setPendingToken(null);
    });

    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToken, showPaymentButton]);

  // onComplete handler for Cash App Pay
  const handleComplete = async (event: CashAppPayCompleteEvent) => {
    addFlowLog({
      type: "callback",
      label: "Cash App Pay onComplete",
      data: { status: event.data.status, cashtag: event.data.cashtag },
    });

    if (event.data.status !== "SUCCESS") {
      setError("Payment was not completed");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Read capture mode from localStorage
      const captureMode = localStorage.getItem("afterpay_capture_mode") || "deferred";
      const isImmediateCapture = captureMode === "immediate";

      let orderId: string;

      // Step 1: Authorize payment
      const authClientRequest = { token: event.data.orderToken };

      const authStartTime = Date.now();
      const authResponse = await fetch("/api/afterpay/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authClientRequest),
      });

      const authData = await authResponse.json();
      const authDuration = Date.now() - authStartTime;

      // Log request with FULL server-side payload from _meta
      addFlowLog({
        type: "api_request",
        label: isImmediateCapture ? "Authorize Payment (Immediate Mode - Step 1)" : "Authorize Payment (Deferred Mode)",
        method: "POST",
        endpoint: "/api/afterpay/auth \u2192 /v2/payments/auth",
        data: authData._meta?.requestBody || authClientRequest,
        fullUrl: authData._meta?.fullUrl,
        headers: authData._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: "Authorization Response",
        method: "POST",
        endpoint: "/v2/payments/auth",
        status: authResponse.status,
        data: authData,
        duration: authDuration,
        fullUrl: authData._meta?.fullUrl,
      });

      if (authData.error) {
        throw new Error(authData.error);
      }

      if (authData.status !== "APPROVED") {
        throw new Error("Payment was not approved");
      }

      orderId = authData.id;

      // Step 2: If immediate capture, capture now
      if (isImmediateCapture) {
        const captureAmount = parseFloat(authData.amount?.amount || authData.originalAmount?.amount);
        const captureClientRequest = { orderId: authData.id, amount: captureAmount };

        const captureStartTime = Date.now();
        const captureResponse = await fetch("/api/afterpay/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captureClientRequest),
        });

        const captureData = await captureResponse.json();
        const captureDuration = Date.now() - captureStartTime;

        // Log request with FULL server-side payload from _meta
        addFlowLog({
          type: "api_request",
          label: "Capture Payment (Immediate Mode - Step 2)",
          method: "POST",
          endpoint: `/api/afterpay/capture \u2192 /v2/payments/${authData.id}/capture`,
          data: captureData._meta?.requestBody || captureClientRequest,
          fullUrl: captureData._meta?.fullUrl,
          headers: captureData._meta?.headers,
        });

        addFlowLog({
          type: "api_response",
          label: "Capture Response",
          method: "POST",
          endpoint: `/v2/payments/${authData.id}/capture`,
          status: captureResponse.status,
          data: captureData,
          duration: captureDuration,
          fullUrl: captureData._meta?.fullUrl,
        });

        if (captureData.error) {
          throw new Error(captureData.error);
        }

        // Update flow summary with auth and capture response data
        updateFlowSummary({
          responseData: {
            'data.orderToken': event.data.orderToken,
            id: authData.id,
            status: captureData.status || 'CAPTURED',
            originalAmount: authData.originalAmount,
            openToCaptureAmount: captureData.openToCapture,
          },
        });
      } else {
        // Update flow summary with auth response data
        updateFlowSummary({
          responseData: {
            'data.orderToken': event.data.orderToken,
            id: authData.id,
            status: authData.status,
            originalAmount: authData.originalAmount,
            openToCaptureAmount: authData.openToCapture,
          },
        });
      }

      // Store pending order in sessionStorage (confirmation page handles saveOrder)
      const currentItems = itemsRef.current;
      sessionStorage.setItem('afterpay_pending_order', JSON.stringify({
        items: currentItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: totalRef.current,
      }));

      const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
      addFlowLog({
        type: "redirect",
        label: "Redirect to Confirmation",
        endpoint: `/confirmation?orderId=${orderId}&status=success&flow=cashapp-${flowSuffix}`,
      });

      router.push(`/confirmation?orderId=${orderId}&status=success&flow=cashapp-${flowSuffix}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment processing failed");
      setIsLoading(false);
    }
  };

  // Handle form submission - create checkout and initialize Cash App Pay
  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Initialize flow logs
    initFlowLogs('cashapp');

    // Initialize flow summary
    setFlowSummary({
      ...FLOW_SUMMARY,
      requestConfig: {},
      responseData: {},
    });

    try {
      // Step 1: Create checkout token
      const checkoutClientRequest = {
        items,
        total: finalTotal,
        mode: "standard" as const,
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
        isCashAppPay: true,
      };

      const startTime = Date.now();
      const response = await fetch("/api/afterpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutClientRequest),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Log request with FULL server-side payload from _meta
      addFlowLog({
        type: "api_request",
        label: "Create Checkout",
        method: "POST",
        endpoint: "/api/afterpay/checkout \u2192 /v2/checkouts",
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
            isCashAppPay: true,
          },
          responseData: {
            token: data.token,
          },
        });
      }

      // Step 2: Show the button container first so the SDK has a DOM target
      setShowPaymentButton(true);
      setFormSubmitted(true);

      // Store token for the useEffect to pick up
      setPendingToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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
      </div>

      {/* Shipping Form (collapsible after submission) */}
      {!formSubmitted ? (
        <form onSubmit={handleContinueToPayment} className="space-y-6">
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

          {/* Continue to Payment Button */}
          <button
            type="submit"
            disabled={isLoading || items.length === 0 || !isReady}
            className="w-full flex items-center justify-center bg-afterpay-black rounded-lg hover:bg-afterpay-gray-800 transition-colors py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white font-medium">Creating checkout...</span>
              </span>
            ) : (
              <span className="text-white font-medium">
                {!isReady ? "Loading SDK..." : "Continue to Payment"}
              </span>
            )}
          </button>
        </form>
      ) : (
        <>
          {/* Collapsed form summary */}
          <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Shipping Details</h3>
              <button
                type="button"
                onClick={handleEditClick}
                className="text-sm text-afterpay-mint hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 space-y-1">
              <p>{formData.firstName} {formData.lastName}</p>
              <p>{formData.email}</p>
              <p>{formData.address1}{formData.address2 ? `, ${formData.address2}` : ""}</p>
              <p>{formData.city}, {formData.state} {formData.postcode}</p>
              <p className="font-medium mt-2">
                {selectedShipping.name} -{" "}
                {selectedShipping.price === 0 ? (
                  <span className="text-green-600 dark:text-green-400">FREE</span>
                ) : (
                  formatPrice(selectedShipping.price)
                )}
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4">
            <div className="space-y-2">
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

          {/* Error Display with Retry */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="ml-4 px-3 py-1 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Cash App Pay Button Container */}
          {showPaymentButton && (
            <div className="space-y-4">
              <p className="text-sm text-center text-afterpay-gray-500 dark:text-afterpay-gray-400">
                <span className="hidden md:inline">
                  Tap the button below, and scan the QR code to pay with Cash App Pay.
                </span>
                <span className="md:hidden">
                  Tap the button below to pay with Cash App Pay.
                </span>
              </p>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <span className="w-5 h-5 border-2 border-afterpay-mint border-t-transparent rounded-full animate-spin" />
                  <span className="text-afterpay-gray-500 font-medium">Processing payment...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Cash App Pay SDK target — always mounted so the SDK can manage its
         own DOM elements across restart/reinitialize cycles. Hidden via CSS
         when the payment button area is not active. */}
      <div
        id="cash-app-pay"
        style={{ display: showPaymentButton && formSubmitted ? undefined : 'none' }}
      />

      {/* Cash App Pay Developer Info Section */}
      <CashAppInfoSection />
    </div>
  );
}
