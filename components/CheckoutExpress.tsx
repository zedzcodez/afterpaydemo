"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCart } from "./CartProvider";
import { useConfig } from "@/components/ConfigProvider";
import { OSMPlacement } from "./OSMPlacement";
import { CodeViewer } from "./CodeViewer";
import { getCartSkus, getCartCategories } from "@/lib/cart";
import { AfterpayShippingOption } from "@/lib/types";
import { getAfterpayShippingOptions } from "@/lib/shipping";
import { captureFullPaymentClient, authorizePaymentClient } from "@/lib/payment-client";
import { initFlowLogs, addFlowLog, logCallback, setFlowSummary, updateFlowSummary, FLOW_SUMMARIES } from "@/lib/flowLogs";
import { toggleDevPanel, useDevPanelState } from "./FlowLogsDevPanel";

type ShippingFlow = "integrated" | "deferred";

interface CheckoutExpressProps {
  isActive?: boolean;
  onLog?: (method: string, endpoint: string, request?: object) => string;
  onLogUpdate?: (
    id: string,
    update: { response?: object; status?: number; error?: string }
  ) => void;
  initialShippingFlow?: ShippingFlow;
}

export function CheckoutExpress({ isActive, onLog, onLogUpdate, initialShippingFlow }: CheckoutExpressProps) {
  const { items, total } = useCart();
  const { config } = useConfig();
  const isDevPanelOpen = useDevPanelState();
  // Shipping flow driven by centralized config; prop is kept as fallback for standalone usage
  const shippingFlow: ShippingFlow = config.expressCheckout.type || initialShippingFlow || "integrated";
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to keep current values accessible in callbacks
  const totalRef = useRef(total);
  const itemsRef = useRef(items);
  const onLogRef = useRef(onLog);
  const onLogUpdateRef = useRef(onLogUpdate);
  const captureModeRef = useRef(config.captureMode);

  useEffect(() => {
    totalRef.current = total;
    itemsRef.current = items;
    onLogRef.current = onLog;
    onLogUpdateRef.current = onLogUpdate;
    captureModeRef.current = config.captureMode;
  }, [total, items, onLog, onLogUpdate, config.captureMode]);

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

    // Extract request config from _meta for flow summary
    const serverRequestBody = data._meta?.requestBody;
    if (serverRequestBody) {
      updateFlowSummary({
        requestConfig: {
          mode: serverRequestBody.mode,
          'merchant.popupOriginUrl': serverRequestBody.merchant?.popupOriginUrl,
          'merchant.redirectConfirmUrl': serverRequestBody.merchant?.redirectConfirmUrl,
          'merchant.redirectCancelUrl': serverRequestBody.merchant?.redirectCancelUrl,
        },
        responseData: {
          token: data.token,
          redirectCheckoutUrl: data.redirectCheckoutUrl,
        },
      });
    }

    return data.token;
  }, []);

  const getShippingOptions = useCallback(() => {
    return getAfterpayShippingOptions(totalRef.current);
  }, []);

  useEffect(() => {
    // Check if Afterpay.js is fully loaded with initializeForPopup available
    let timeoutId: ReturnType<typeof setTimeout>;
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay && typeof window.Afterpay.initializeForPopup === 'function') {
        setIsReady(true);
      } else {
        timeoutId = setTimeout(checkAfterpay, 100);
      }
    };
    checkAfterpay();
    return () => clearTimeout(timeoutId);
  }, []);

  // Guard refs to prevent duplicate initializeForPopup calls on tab re-activation
  const hasInitializedPopupRef = useRef(false);
  const lastShippingFlowRef = useRef(shippingFlow);

  useEffect(() => {
    if (!isActive) return; // Don't initialize when tab is inactive
    if (!isReady || !window.Afterpay || typeof window.Afterpay.initializeForPopup !== 'function') return;

    // Skip re-init if config hasn't changed (safe re-activation)
    if (hasInitializedPopupRef.current && lastShippingFlowRef.current === shippingFlow) return;

    // Initialize flow logs when starting checkout
    const flowType = shippingFlow === "integrated" ? "express-integrated" : "express-deferred";
    initFlowLogs(flowType);

    // Initialize flow summary with base info
    const baseSummary = FLOW_SUMMARIES[flowType];
    setFlowSummary({
      ...baseSummary,
      requestConfig: {},
      responseData: {},
    });

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
              // Read capture mode from centralized config
              const captureMode = captureModeRef.current;
              const isImmediateCapture = captureMode === "immediate";

              try {
                let orderId: string;

                if (isImmediateCapture) {
                  // Immediate Capture: single-step capture-full (auth + capture combined)
                  const result = await captureFullPaymentClient(event.data.orderToken);

                  updateFlowSummary({
                    responseData: {
                      'data.orderToken': event.data.orderToken,
                      id: result.data.id,
                      status: result.data.status,
                      originalAmount: result.data.originalAmount,
                      openToCaptureAmount: result.data.openToCapture,
                    },
                  });

                  orderId = result.orderId;
                } else {
                  // Deferred Capture Mode: Only authorize
                  const result = await authorizePaymentClient(event.data.orderToken);

                  updateFlowSummary({
                    responseData: {
                      token: result.data.token,
                      'data.orderToken': event.data.orderToken,
                      id: result.data.id,
                      status: result.data.status,
                      originalAmount: result.data.originalAmount,
                      openToCaptureAmount: result.data.openToCapture,
                    },
                  });

                  orderId = result.orderId;
                }

                // Store cart data in sessionStorage before redirecting (for confirmation page)
                const currentItems = itemsRef.current;
                const currentTotal = totalRef.current;
                sessionStorage.setItem('afterpay_pending_order', JSON.stringify({
                  items: currentItems.map(item => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                  })),
                  total: currentTotal,
                }));

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

            // Add deferred-specific config to summary
            updateFlowSummary({
              requestConfig: {
                shippingOptionRequired: false,
              },
            });

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
              // Store cart data in sessionStorage for shipping page
              const currentItems = itemsRef.current;
              const currentTotal = totalRef.current;
              sessionStorage.setItem('afterpay_checkout_cart', JSON.stringify({
                items: currentItems.map(item => ({
                  productId: item.product.id,
                  productName: item.product.name,
                  quantity: item.quantity,
                  price: item.product.price,
                })),
                total: currentTotal,
              }));

              // Update flow summary with orderToken before redirect
              updateFlowSummary({
                responseData: {
                  'data.orderToken': event.data.orderToken,
                },
              });

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
    hasInitializedPopupRef.current = true;
    lastShippingFlowRef.current = shippingFlow;
  }, [isActive, isReady, shippingFlow, createCheckoutToken, getShippingOptions]);

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
      {/* Shipping Flow Indicator (controlled by config) */}
      <div>
        <label className="block text-sm font-medium mb-3">Shipping Flow</label>
        <div className="flex gap-2">
          <div
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              shippingFlow === "integrated"
                ? "border-afterpay-mint bg-afterpay-mint/10"
                : "border-afterpay-gray-200 dark:border-afterpay-gray-700"
            }`}
          >
            <span className="block font-medium">Integrated</span>
            <span className="block text-xs text-afterpay-gray-500">
              Shipping in popup
            </span>
          </div>
          <div
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              shippingFlow === "deferred"
                ? "border-afterpay-mint bg-afterpay-mint/10"
                : "border-afterpay-gray-200 dark:border-afterpay-gray-700"
            }`}
          >
            <span className="block font-medium">Deferred</span>
            <span className="block text-xs text-afterpay-gray-500">
              Shipping on site
            </span>
          </div>
        </div>
        <p className="text-xs text-afterpay-gray-500 mt-2">
          Controlled via Settings panel
        </p>
      </div>

      {/* Flow Description */}
      <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 text-sm">
        {shippingFlow === "integrated" ? (
          <>
            <p className="font-medium mb-2">Integrated Shipping Flow</p>
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
              Customer selects shipping options directly within the Afterpay
              popup. Uses <code className="bg-afterpay-gray-200 dark:bg-afterpay-gray-700 px-1.5 py-0.5 rounded text-afterpay-black dark:text-afterpay-mint font-mono text-xs">onShippingAddressChange</code> callback to
              provide dynamic shipping options.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium mb-2">Deferred Shipping Flow</p>
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
              Customer confirms address in Afterpay, then returns to your site
              to select shipping. Requires displaying the checkout widget with
              payment schedule.
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
          title={`View ${shippingFlow === "integrated" ? "Integrated" : "Deferred"} Shipping Code`}
          code={shippingFlow === "integrated" ? integratedCode : deferredCode}
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
    </div>
  );
}
