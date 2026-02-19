"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/components/ConfigProvider";
import { useCart } from "@/components/CartProvider";
import { Product } from "@/lib/types";
import {
  initFlowLogs,
  addFlowLog,
  logCallback,
  setFlowSummary,
  updateFlowSummary,
  FlowSummary,
} from "@/lib/flowLogs";

interface BuyNowItem {
  product: Product;
  quantity: number;
}

interface StartBuyNowParams {
  items: BuyNowItem[];
  total: number;
}

interface UseBuyNowCheckoutReturn {
  startBuyNow: (params: StartBuyNowParams) => Promise<void>;
  isLoading: boolean;
  error: string | null;
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

// Flow summary definitions for Buy Now
const FLOW_SUMMARIES: Record<string, Omit<FlowSummary, "requestConfig" | "responseData">> = {
  "buynow-integrated": {
    flow: "buynow-integrated",
    description:
      "Buy Now popup checkout where customer selects shipping options directly within the Afterpay popup using the onShippingAddressChange callback.",
    steps: ["Create Checkout", "Afterpay Popup (with shipping)", "Authorize Payment"],
    docsUrl:
      "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  },
  "buynow-deferred": {
    flow: "buynow-deferred",
    description:
      "Buy Now popup checkout where customer completes payment in Afterpay, then returns to merchant site to select shipping before authorization.",
    steps: ["Create Checkout", "Afterpay Popup", "Select Shipping", "Authorize Payment"],
    docsUrl:
      "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping",
  },
};

function getAfterpaySdk() {
  if (typeof window === "undefined") return null;
  // The SDK may be available as either window.AfterPay or window.Afterpay
  return window.Afterpay ?? null;
}

export function useBuyNowCheckout(targetId: string = "buynow-afterpay-button"): UseBuyNowCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { config } = useConfig();
  const { clearCart } = useCart();

  // Use refs to keep values accessible in popup callbacks
  const paramsRef = useRef<StartBuyNowParams | null>(null);

  const startBuyNow = useCallback(
    async (params: StartBuyNowParams) => {
      const sdk = getAfterpaySdk();
      if (!sdk || typeof sdk.initializeForPopup !== "function") {
        setError("Afterpay SDK is not loaded. Please try again.");
        return;
      }

      setIsLoading(true);
      setError(null);
      paramsRef.current = params;

      const shippingFlow = config.expressCheckout.type; // "integrated" | "deferred"
      const captureMode = config.captureMode; // "deferred" | "immediate"

      // Initialize flow logs
      const flowType = shippingFlow === "integrated" ? "buynow-integrated" : "buynow-deferred";
      initFlowLogs(flowType);

      const baseSummary = FLOW_SUMMARIES[flowType];
      setFlowSummary({
        ...baseSummary,
        requestConfig: {},
        responseData: {},
      });

      // Helper: create checkout token via API
      const createCheckoutToken = async (): Promise<string> => {
        const currentParams = paramsRef.current!;
        const clientRequestBody = {
          items: currentParams.items.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          })),
          total: currentParams.total,
          mode: "express" as const,
          isCashAppPay: false,
        };

        const startTime = Date.now();
        const response = await fetch("/api/afterpay/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientRequestBody),
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        // Log request with full server-side payload from _meta
        addFlowLog({
          type: "api_request",
          label: "Create Checkout",
          method: "POST",
          endpoint: "/api/afterpay/checkout -> /v2/checkouts",
          data: data._meta?.requestBody || clientRequestBody,
          fullUrl: data._meta?.fullUrl,
          headers: data._meta?.headers,
        });

        addFlowLog({
          type: "api_response",
          label: "Checkout Created",
          method: "POST",
          endpoint: "/v2/checkouts",
          status: response.status,
          data,
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
              "merchant.popupOriginUrl": serverRequestBody.merchant?.popupOriginUrl,
              "merchant.redirectConfirmUrl": serverRequestBody.merchant?.redirectConfirmUrl,
              "merchant.redirectCancelUrl": serverRequestBody.merchant?.redirectCancelUrl,
            },
            responseData: {
              token: data.token,
              redirectCheckoutUrl: data.redirectCheckoutUrl,
            },
          });
        }

        return data.token;
      };

      // Helper: get shipping options based on current total
      const getShippingOptions = () => {
        const currentTotal = paramsRef.current!.total;
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
      };

      // Helper: handle authorization (and optional capture for immediate mode)
      const handleAuthorization = async (orderToken: string): Promise<void> => {
        const isImmediateCapture = captureMode === "immediate";
        const currentParams = paramsRef.current!;

        try {
          let orderId: string;

          if (isImmediateCapture) {
            // Immediate Capture: Auth first then capture
            const authClientRequest = { token: orderToken };

            const authStartTime = Date.now();
            const authResponse = await fetch("/api/afterpay/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(authClientRequest),
            });

            const authData = await authResponse.json();
            const authDuration = Date.now() - authStartTime;

            addFlowLog({
              type: "api_request",
              label: "Authorize Payment (Immediate Mode - Step 1)",
              method: "POST",
              endpoint: "/api/afterpay/auth -> /v2/payments/auth",
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

            // Capture the authorized amount
            const captureAmount = parseFloat(
              authData.amount?.amount || authData.originalAmount?.amount
            );
            const captureClientRequest = { orderId: authData.id, amount: captureAmount };

            const captureStartTime = Date.now();
            const captureResponse = await fetch("/api/afterpay/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(captureClientRequest),
            });

            const captureData = await captureResponse.json();
            const captureDuration = Date.now() - captureStartTime;

            addFlowLog({
              type: "api_request",
              label: "Capture Payment (Immediate Mode - Step 2)",
              method: "POST",
              endpoint: `/api/afterpay/capture -> /v2/payments/${authData.id}/capture`,
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

            updateFlowSummary({
              responseData: {
                token: authData.token,
                "data.orderToken": orderToken,
                id: authData.id,
                status: captureData.status || "CAPTURED",
                originalAmount: authData.originalAmount,
                openToCaptureAmount: captureData.openToCapture,
              },
            });

            orderId = authData.id;
          } else {
            // Deferred Capture: Only authorize
            const authClientRequest = { token: orderToken };

            const startTime = Date.now();
            const response = await fetch("/api/afterpay/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(authClientRequest),
            });

            const data = await response.json();
            const duration = Date.now() - startTime;

            addFlowLog({
              type: "api_request",
              label: "Authorize Payment (Deferred Mode)",
              method: "POST",
              endpoint: "/api/afterpay/auth -> /v2/payments/auth",
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
              data,
              duration,
              fullUrl: data._meta?.fullUrl,
            });

            if (data.status !== "APPROVED") {
              throw new Error("Payment was not approved");
            }

            updateFlowSummary({
              responseData: {
                token: data.token,
                "data.orderToken": orderToken,
                id: data.id,
                status: data.status,
                originalAmount: data.originalAmount,
                openToCaptureAmount: data.openToCapture,
              },
            });

            orderId = data.id;
          }

          // Store order data in sessionStorage for confirmation page
          sessionStorage.setItem(
            "afterpay_pending_order",
            JSON.stringify({
              items: currentParams.items.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
              })),
              total: currentParams.total,
            })
          );

          // Clear the cart after successful checkout
          clearCart();

          const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
          const flowName = `buynow-${shippingFlow}-${flowSuffix}`;

          addFlowLog({
            type: "redirect",
            label: "Redirect to Confirmation",
            endpoint: `/confirmation?orderId=${orderId}&status=success&flow=${flowName}`,
          });

          router.push(
            `/confirmation?orderId=${orderId}&status=success&flow=${flowName}&total=${currentParams.total.toFixed(2)}`
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment was not approved");
          setIsLoading(false);
        }
      };

      // Build the SDK popup configuration
      const popupConfig =
        shippingFlow === "integrated"
          ? {
              countryCode: "US",
              target: `#${targetId}`,
              addressMode:
                sdk.ADDRESS_MODES?.ADDRESS_WITH_SHIPPING_OPTIONS ||
                "ADDRESS_WITH_SHIPPING_OPTIONS",
              buyNow: true,
              onCommenceCheckout: async (actions: {
                resolve: (token: string) => void;
                reject: (error: { message: string }) => void;
              }) => {
                logCallback("onCommenceCheckout", { flow: "buynow-integrated" });
                try {
                  const token = await createCheckoutToken();
                  logCallback("onCommenceCheckout resolved", {
                    token: token.substring(0, 20) + "...",
                  });
                  actions.resolve(token);
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Checkout failed";
                  logCallback("onCommenceCheckout rejected", { error: message });
                  setError(message);
                  setIsLoading(false);
                  actions.reject({ message });
                }
              },
              onShippingAddressChange: (
                addressData: {
                  address: {
                    area1: string;
                    area2?: string;
                    countryCode: string;
                    postcode: string;
                  };
                },
                actions: {
                  resolve: (
                    options: Array<{
                      id: string;
                      name: string;
                      description?: string;
                      shippingAmount: { amount: string; currency: string };
                      taxAmount?: { amount: string; currency: string };
                      orderAmount: { amount: string; currency: string };
                    }>
                  ) => void;
                  reject: (error: { message: string }) => void;
                }
              ) => {
                logCallback("onShippingAddressChange", { address: addressData.address });
                try {
                  const options = getShippingOptions();
                  logCallback("onShippingAddressChange resolved", {
                    optionCount: options.length,
                    options: options.map((o) => ({
                      id: o.id,
                      name: o.name,
                      amount: o.orderAmount.amount,
                    })),
                  });
                  actions.resolve(options);
                } catch (err) {
                  console.error("Error getting shipping options:", err);
                  logCallback("onShippingAddressChange rejected", {
                    error: "Unable to calculate shipping",
                  });
                  actions.reject({ message: "Unable to calculate shipping" });
                }
              },
              onComplete: async (event: {
                data: { status: string; orderToken: string; orderInfo?: object };
              }) => {
                logCallback("onComplete", {
                  status: event.data.status,
                  orderInfo: event.data.orderInfo,
                });

                if (event.data.status === "SUCCESS") {
                  await handleAuthorization(event.data.orderToken);
                } else {
                  setError("Checkout was cancelled");
                  setIsLoading(false);
                }
              },
            }
          : {
              countryCode: "US",
              target: `#${targetId}`,
              shippingOptionRequired: false,
              buyNow: true,
              onCommenceCheckout: async (actions: {
                resolve: (token: string) => void;
                reject: (error: { message: string }) => void;
              }) => {
                logCallback("onCommenceCheckout", { flow: "buynow-deferred" });

                updateFlowSummary({
                  requestConfig: {
                    shippingOptionRequired: false,
                  },
                });

                try {
                  const token = await createCheckoutToken();
                  logCallback("onCommenceCheckout resolved", {
                    token: token.substring(0, 20) + "...",
                  });
                  actions.resolve(token);
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Checkout failed";
                  logCallback("onCommenceCheckout rejected", { error: message });
                  setError(message);
                  setIsLoading(false);
                  actions.reject({ message });
                }
              },
              onComplete: async (event: {
                data: {
                  status: string;
                  orderToken: string;
                  shippingAddress?: object;
                  consumer?: object;
                };
              }) => {
                logCallback("onComplete", {
                  status: event.data.status,
                  shippingAddress: event.data.shippingAddress,
                  consumer: event.data.consumer,
                });

                if (event.data.status === "SUCCESS") {
                  // For deferred shipping, redirect to shipping selection page
                  const currentParams = paramsRef.current!;
                  sessionStorage.setItem(
                    "afterpay_checkout_cart",
                    JSON.stringify({
                      items: currentParams.items.map((item) => ({
                        productId: item.product.id,
                        productName: item.product.name,
                        quantity: item.quantity,
                        price: item.product.price,
                      })),
                      total: currentParams.total,
                    })
                  );

                  updateFlowSummary({
                    responseData: {
                      "data.orderToken": event.data.orderToken,
                    },
                  });

                  clearCart();

                  const searchParams = new URLSearchParams({
                    token: event.data.orderToken,
                    flow: "deferred",
                  });

                  addFlowLog({
                    type: "redirect",
                    label: "Redirect to Shipping Selection",
                    endpoint: `/checkout/shipping?${searchParams.toString()}`,
                  });

                  router.push(`/checkout/shipping?${searchParams.toString()}`);
                } else {
                  setError("Checkout was cancelled");
                  setIsLoading(false);
                }
              },
            };

      try {
        sdk.initializeForPopup(popupConfig);

        // initializeForPopup binds a click handler to the target element.
        // Clicking the target triggers onCommenceCheckout and opens the popup.
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.click();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize Afterpay popup";
        setError(message);
        setIsLoading(false);
      }
    },
    [targetId, config.expressCheckout.type, config.captureMode, clearCart, router]
  );

  return { startBuyNow, isLoading, error };
}
