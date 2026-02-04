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

export function CheckoutExpress({ onLog, onLogUpdate }: CheckoutExpressProps) {
  const { items, total } = useCart();
  const [shippingFlow, setShippingFlow] = useState<ShippingFlow>("integrated");
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

    const requestBody = { items: currentItems, total: currentTotal, mode: "express" };

    const logId = onLogRef.current?.("POST", "/api/afterpay/checkout", requestBody);

    // Log to flow logs
    addFlowLog({
      type: "api_request",
      label: "Create Checkout",
      method: "POST",
      endpoint: "/api/afterpay/checkout → /v2/checkouts",
      data: requestBody,
    });

    const startTime = Date.now();
    const response = await fetch("/api/afterpay/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    onLogUpdateRef.current?.(logId!, { response: data, status: response.status });

    // Log response
    addFlowLog({
      type: "api_response",
      label: "Checkout Created",
      method: "POST",
      endpoint: "/v2/checkouts",
      status: response.status,
      data: data,
      duration,
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
                  // Immediate Capture Mode: Use Capture Full Payment API
                  const captureFullRequest = { token: event.data.orderToken };
                  const logId = onLogRef.current?.("POST", "/api/afterpay/capture-full", captureFullRequest);

                  addFlowLog({
                    type: "api_request",
                    label: "Capture Full Payment (Immediate Mode)",
                    method: "POST",
                    endpoint: "/api/afterpay/capture-full → /v2/payments/capture",
                    data: captureFullRequest,
                  });

                  const startTime = Date.now();
                  const response = await fetch("/api/afterpay/capture-full", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(captureFullRequest),
                  });

                  const data = await response.json();
                  const duration = Date.now() - startTime;
                  onLogUpdateRef.current?.(logId!, { response: data, status: response.status });

                  addFlowLog({
                    type: "api_response",
                    label: "Capture Full Response",
                    method: "POST",
                    endpoint: "/v2/payments/capture",
                    status: response.status,
                    data: data,
                    duration,
                  });

                  if (data.status !== "APPROVED") {
                    throw new Error("Payment was not approved");
                  }

                  orderId = data.id;
                } else {
                  // Deferred Capture Mode: Only authorize
                  const authRequest = { token: event.data.orderToken };
                  const logId = onLogRef.current?.("POST", "/api/afterpay/auth", authRequest);

                  addFlowLog({
                    type: "api_request",
                    label: "Authorize Payment (Deferred Mode)",
                    method: "POST",
                    endpoint: "/api/afterpay/auth → /v2/payments/auth",
                    data: authRequest,
                  });

                  const startTime = Date.now();
                  const response = await fetch("/api/afterpay/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(authRequest),
                  });

                  const data = await response.json();
                  const duration = Date.now() - startTime;
                  onLogUpdateRef.current?.(logId!, { response: data, status: response.status });

                  addFlowLog({
                    type: "api_response",
                    label: "Authorization Response",
                    method: "POST",
                    endpoint: "/v2/payments/auth",
                    status: response.status,
                    data: data,
                    duration,
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
                : "border-afterpay-gray-200 hover:border-afterpay-gray-300"
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
                : "border-afterpay-gray-200 hover:border-afterpay-gray-300"
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
      <div className="bg-afterpay-gray-50 rounded-lg p-4 text-sm">
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

      {/* Afterpay Button */}
      <button
        id="afterpay-express-button"
        disabled={!isReady || items.length === 0}
        className="w-full py-4 px-6 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span>Pay with</span>
        <span className="bg-afterpay-mint text-afterpay-black px-2 py-0.5 rounded text-sm font-bold">
          Afterpay
        </span>
      </button>

      {/* Code Viewer */}
      <CodeViewer
        title={`View ${shippingFlow === "integrated" ? "Integrated" : "Deferred"} Shipping Code`}
        code={shippingFlow === "integrated" ? integratedCode : deferredCode}
      />
    </div>
  );
}
