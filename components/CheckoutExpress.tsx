"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "./CartProvider";
import { OSMPlacement } from "./OSMPlacement";
import { CodeViewer } from "./CodeViewer";
import { getCartSkus, getCartCategories } from "@/lib/cart";
import { AfterpayShippingOption } from "@/lib/types";
import { initFlowLogs, addFlowLog, logCallback } from "@/lib/flowLogs";

type ShippingFlow = "integrated" | "deferred";

interface CheckoutExpressProps {
  onLog?: (method: string, endpoint: string, request?: object) => string;
  onLogUpdate?: (
    id: string,
    update: { response?: object; status?: number; error?: string }
  ) => void;
  initialShippingFlow?: ShippingFlow;
}

const SHIPPING_OPTIONS = [
  {
    id: "standard",
    name: "Standard Shipping",
    description: "5-7 business days",
    shippingAmount: { amount: "5.99", currency: "USD" },
  },
  {
    id: "express",
    name: "Express Shipping",
    description: "2-3 business days",
    shippingAmount: { amount: "12.99", currency: "USD" },
  },
  {
    id: "overnight",
    name: "Overnight Shipping",
    description: "Next business day",
    shippingAmount: { amount: "24.99", currency: "USD" },
  },
];

export function CheckoutExpress({ onLog, onLogUpdate, initialShippingFlow }: CheckoutExpressProps) {
  const { items, total } = useCart();
  const [shippingFlow, setShippingFlow] = useState<ShippingFlow>(initialShippingFlow || "integrated");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to keep current values accessible in callbacks
  const totalRef = useRef(total);
  const itemsRef = useRef(items);
  const onLogRef = useRef(onLog);
  const onLogUpdateRef = useRef(onLogUpdate);

  useEffect(() => {
    totalRef.current = total;
    itemsRef.current = items;
    onLogRef.current = onLog;
    onLogUpdateRef.current = onLogUpdate;
  }, [total, items, onLog, onLogUpdate]);

  const createCheckoutToken = useCallback(async () => {
    const currentItems = itemsRef.current;
    const currentTotal = totalRef.current;

    const clientRequestBody = { items: currentItems, total: currentTotal, mode: "express" };

    const logId = onLogRef.current?.("POST", "/api/afterpay/checkout", clientRequestBody);

    const startTime = Date.now();
    const response = await fetch("/api/afterpay/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientRequestBody),
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    onLogUpdateRef.current?.(logId!, { response: data, status: response.status });

    // Log request with FULL server-side payload from _meta (includes merchantReference, merchant URLs, etc.)
    addFlowLog({
      type: "api_request",
      label: "Create Checkout",
      method: "POST",
      endpoint: "/api/afterpay/checkout → /v2/checkouts",
      data: data._meta?.requestBody || clientRequestBody,
      fullUrl: data._meta?.fullUrl,
      headers: data._meta?.headers,
    });

    // Log response
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

    return data.token;
  }, []);

  const getShippingOptions = useCallback(() => {
    const currentTotal = totalRef.current;

    return SHIPPING_OPTIONS.map((opt) => {
      const shippingCost = parseFloat(opt.shippingAmount.amount);
      const isFreeShipping = currentTotal >= 100 && opt.id === "standard";

      return {
        id: opt.id,
        name: isFreeShipping ? "Free Standard Shipping" : opt.name,
        description: opt.description,
        shippingAmount: isFreeShipping
          ? { amount: "0.00", currency: "USD" }
          : opt.shippingAmount,
        taxAmount: { amount: "0.00", currency: "USD" },
        orderAmount: {
          amount: (currentTotal + (isFreeShipping ? 0 : shippingCost)).toFixed(2),
          currency: "USD",
        },
      };
    });
  }, []);

  useEffect(() => {
    // Check if Afterpay.js is loaded
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay) {
        setIsReady(true);
      } else {
        setTimeout(checkAfterpay, 100);
      }
    };
    checkAfterpay();
  }, []);

  useEffect(() => {
    if (!isReady || !window.Afterpay) return;

    // Initialize flow logs when starting checkout
    initFlowLogs(shippingFlow === "integrated" ? "express-integrated" : "express-deferred");

    const config = shippingFlow === "integrated"
      ? {
          countryCode: "US",
          target: "#afterpay-express-button",
          addressMode: window.Afterpay.ADDRESS_MODES?.ADDRESS_WITH_SHIPPING_OPTIONS || "ADDRESS_WITH_SHIPPING_OPTIONS",
          buyNow: false,
          onCommenceCheckout: async (actions: { resolve: (token: string) => void; reject: (error: { message: string }) => void }) => {
            logCallback("onCommenceCheckout", { flow: "integrated" });
            try {
              const token = await createCheckoutToken();
              logCallback("onCommenceCheckout resolved", { token: token.substring(0, 20) + "..." });
              actions.resolve(token);
            } catch (err) {
              const message = err instanceof Error ? err.message : "Checkout failed";
              logCallback("onCommenceCheckout rejected", { error: message });
              setError(message);
              actions.reject({ message });
            }
          },
          onShippingAddressChange: (
            addressData: { address: { area1: string; area2?: string; countryCode: string; postcode: string } },
            actions: { resolve: (options: AfterpayShippingOption[]) => void; reject: (error: { message: string }) => void }
          ) => {
            logCallback("onShippingAddressChange", { address: addressData.address });
            try {
              const options = getShippingOptions();
              logCallback("onShippingAddressChange resolved", {
                optionCount: options.length,
                options: options.map(o => ({ id: o.id, name: o.name, amount: o.orderAmount.amount }))
              });
              actions.resolve(options);
            } catch (err) {
              console.error("Error getting shipping options:", err);
              logCallback("onShippingAddressChange rejected", { error: "Unable to calculate shipping" });
              actions.reject({ message: "Unable to calculate shipping" });
            }
          },
          onComplete: async (event: { data: { status: string; orderToken: string; orderInfo?: object } }) => {
            logCallback("onComplete", { status: event.data.status, orderInfo: event.data.orderInfo });

            if (event.data.status === "SUCCESS") {
              // Check capture mode from localStorage
              const captureMode = localStorage.getItem("afterpay_capture_mode") || "deferred";
              const isImmediateCapture = captureMode === "immediate";

              try {
                let orderId: string;

                if (isImmediateCapture) {
                  // Immediate Capture Mode: Auth first (to get correct amount), then capture
                  // Express Checkout with integrated shipping changes the amount in the popup,
                  // so we must auth first (which fetches the checkout to get the final amount)
                  const authClientRequest = { token: event.data.orderToken };
                  const authLogId = onLogRef.current?.("POST", "/api/afterpay/auth", authClientRequest);

                  const authStartTime = Date.now();
                  const authResponse = await fetch("/api/afterpay/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(authClientRequest),
                  });

                  const authData = await authResponse.json();
                  const authDuration = Date.now() - authStartTime;
                  onLogUpdateRef.current?.(authLogId!, { response: authData, status: authResponse.status });

                  // Log request with FULL server-side payload from _meta
                  addFlowLog({
                    type: "api_request",
                    label: "Authorize Payment (Immediate Mode - Step 1)",
                    method: "POST",
                    endpoint: "/api/afterpay/auth → /v2/payments/auth",
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

                  if (authData.status !== "APPROVED") {
                    throw new Error("Payment authorization failed");
                  }

                  // Now capture the authorized amount
                  const captureAmount = parseFloat(authData.amount?.amount || authData.originalAmount?.amount);
                  const captureClientRequest = { orderId: authData.id, amount: captureAmount };
                  const captureLogId = onLogRef.current?.("POST", "/api/afterpay/capture", captureClientRequest);

                  const captureStartTime = Date.now();
                  const captureResponse = await fetch("/api/afterpay/capture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(captureClientRequest),
                  });

                  const captureData = await captureResponse.json();
                  const captureDuration = Date.now() - captureStartTime;
                  onLogUpdateRef.current?.(captureLogId!, { response: captureData, status: captureResponse.status });

                  // Log request with FULL server-side payload from _meta
                  addFlowLog({
                    type: "api_request",
                    label: "Capture Payment (Immediate Mode - Step 2)",
                    method: "POST",
                    endpoint: `/api/afterpay/capture → /v2/payments/${authData.id}/capture`,
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

                  orderId = authData.id;
                } else {
                  // Deferred Capture Mode: Only authorize
                  const authClientRequest = { token: event.data.orderToken };
                  const logId = onLogRef.current?.("POST", "/api/afterpay/auth", authClientRequest);

                  const startTime = Date.now();
                  const response = await fetch("/api/afterpay/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(authClientRequest),
                  });

                  const data = await response.json();
                  const duration = Date.now() - startTime;
                  onLogUpdateRef.current?.(logId!, { response: data, status: response.status });

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

                  if (data.status !== "APPROVED") {
                    throw new Error("Payment was not approved");
                  }

                  orderId = data.id;
                }

                const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
                addFlowLog({
                  type: "redirect",
                  label: "Redirect to Confirmation",
                  endpoint: `/confirmation?orderId=${orderId}&status=success&flow=express-integrated-${flowSuffix}`,
                });
                window.location.href = `/confirmation?orderId=${orderId}&status=success&flow=express-integrated-${flowSuffix}`;
              } catch (err) {
                setError(err instanceof Error ? err.message : "Payment was not approved");
              }
            } else {
              setError("Checkout was cancelled");
            }
          },
        }
      : {
          countryCode: "US",
          target: "#afterpay-express-button",
          shippingOptionRequired: false,
          onCommenceCheckout: async (actions: { resolve: (token: string) => void; reject: (error: { message: string }) => void }) => {
            logCallback("onCommenceCheckout", { flow: "deferred" });
            try {
              const token = await createCheckoutToken();
              logCallback("onCommenceCheckout resolved", { token: token.substring(0, 20) + "..." });
              actions.resolve(token);
            } catch (err) {
              const message = err instanceof Error ? err.message : "Checkout failed";
              logCallback("onCommenceCheckout rejected", { error: message });
              setError(message);
              actions.reject({ message });
            }
          },
          onComplete: (event: { data: { status: string; orderToken: string; shippingAddress?: object; consumer?: object } }) => {
            logCallback("onComplete", {
              status: event.data.status,
              shippingAddress: event.data.shippingAddress,
              consumer: event.data.consumer
            });

            if (event.data.status === "SUCCESS") {
              const params = new URLSearchParams({
                token: event.data.orderToken,
                flow: "deferred",
              });
              addFlowLog({
                type: "redirect",
                label: "Redirect to Shipping Selection",
                endpoint: `/checkout/shipping?${params.toString()}`,
              });
              window.location.href = `/checkout/shipping?${params.toString()}`;
            } else {
              setError("Checkout was cancelled");
            }
          },
        };

    window.Afterpay.initializeForPopup(config);
  }, [isReady, shippingFlow, createCheckoutToken, getShippingOptions]);

  const integratedCode = `
// Integrated Shipping - Afterpay.js Configuration
Afterpay.initializeForPopup({
  countryCode: 'US',
  target: '#afterpay-button',
  addressMode: Afterpay.ADDRESS_MODES.ADDRESS_WITH_SHIPPING_OPTIONS,

  onCommenceCheckout: async (actions) => {
    const response = await fetch('/api/afterpay/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, total, mode: 'express' })
    });
    const { token } = await response.json();
    actions.resolve(token);
  },

  onShippingAddressChange: (data, actions) => {
    // Return shipping options based on address
    actions.resolve([
      {
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        shippingAmount: { amount: '5.99', currency: 'USD' },
        taxAmount: { amount: '0.00', currency: 'USD' },
        orderAmount: { amount: (total + 5.99).toFixed(2), currency: 'USD' }
      }
    ]);
  },

  onComplete: async (event) => {
    if (event.data.status === 'SUCCESS') {
      // Authorize payment
      await fetch('/api/afterpay/auth', {
        method: 'POST',
        body: JSON.stringify({ token: event.data.orderToken })
      });
    }
  }
});`;

  const deferredCode = `
// Deferred Shipping - Afterpay.js Configuration
Afterpay.initializeForPopup({
  countryCode: 'US',
  target: '#afterpay-button',
  shippingOptionRequired: false,

  onCommenceCheckout: async (actions) => {
    const response = await fetch('/api/afterpay/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, total, mode: 'express' })
    });
    const { token } = await response.json();
    actions.resolve(token);
  },

  onComplete: (event) => {
    if (event.data.status === 'SUCCESS') {
      // Customer returns to merchant site
      // Show shipping options + checkout widget
      // Capture payment after shipping selection
      redirectToShippingPage(event.data.orderToken);
    }
  }
});`;

  return (
    <div className="space-y-6">
      {/* Shipping Flow Toggle */}
      <div>
        <label className="block text-sm font-medium mb-3">Shipping Flow</label>
        <div className="flex gap-2">
          <button
            onClick={() => setShippingFlow("integrated")}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              shippingFlow === "integrated"
                ? "border-afterpay-mint bg-afterpay-mint/10"
                : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
            }`}
          >
            <span className="block font-medium">Integrated</span>
            <span className="block text-xs text-afterpay-gray-500">
              Shipping in popup
            </span>
          </button>
          <button
            onClick={() => setShippingFlow("deferred")}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              shippingFlow === "deferred"
                ? "border-afterpay-mint bg-afterpay-mint/10"
                : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
            }`}
          >
            <span className="block font-medium">Deferred</span>
            <span className="block text-xs text-afterpay-gray-500">
              Shipping on site
            </span>
          </button>
        </div>
      </div>

      {/* Flow Description */}
      <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 text-sm">
        {shippingFlow === "integrated" ? (
          <>
            <p className="font-medium mb-2">Integrated Shipping Flow</p>
            <p className="text-afterpay-gray-600">
              Customer selects shipping options directly within the Afterpay
              popup. Uses <code>onShippingAddressChange</code> callback to
              provide dynamic shipping options.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium mb-2">Deferred Shipping Flow</p>
            <p className="text-afterpay-gray-600">
              Customer confirms address in Afterpay, then returns to your site
              to select shipping. Requires displaying the checkout widget with
              payment schedule.
            </p>
          </>
        )}
      </div>

      {/* OSM Placement */}
      <div className="p-4 bg-afterpay-gray-50 rounded-lg">
        <OSMPlacement
          pageType="cart"
          amount={total}
          currency="USD"
          itemSkus={getCartSkus(items)}
          itemCategories={getCartCategories(items)}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Afterpay Button - Official Asset */}
      <button
        id="afterpay-express-button"
        disabled={!isReady || items.length === 0}
        aria-label="Pay with Cash App Afterpay"
        className="w-full flex items-center justify-center bg-afterpay-black rounded-lg hover:bg-afterpay-gray-800 transition-colors py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <img
          alt="Pay with Cash App Afterpay"
          aria-hidden="true"
          src="https://static.afterpaycdn.com/en-US/integration/button/pay-with-afterpay/color-on-black.svg"
          height="48"
          className="h-12"
        />
      </button>

      {/* Code Viewer */}
      <CodeViewer
        title={`View ${shippingFlow === "integrated" ? "Integrated" : "Deferred"} Shipping Code`}
        code={shippingFlow === "integrated" ? integratedCode : deferredCode}
      />
    </div>
  );
}
