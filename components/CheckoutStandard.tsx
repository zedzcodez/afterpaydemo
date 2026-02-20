"use client";

/**
 * Standard Checkout Payment Button
 *
 * Renders the "Pay with Afterpay" button and handles the standard checkout flow.
 * Supports two checkout modes configured via Admin:
 * 1. Redirect: Customer is redirected to Afterpay, then back to merchant site
 * 2. Popup: Afterpay opens in a popup window, customer stays on merchant site
 *
 * Form data is managed by the parent checkout page and passed via props.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useCart } from "./CartProvider";
import { useConfig } from "./ConfigProvider";
import { AfterpayButton } from "./AfterpayButton";
import { initFlowLogs, addFlowLog, logCallback, setFlowSummary, updateFlowSummary, FLOW_SUMMARIES } from "@/lib/flowLogs";
import { captureFullPaymentClient, authorizePaymentClient } from "@/lib/payment-client";
import type { CheckoutFormData, LocalShippingOption } from "@/lib/types";

type CheckoutMode = "redirect" | "popup";

interface CheckoutStandardProps {
  formData: CheckoutFormData;
  selectedShipping: LocalShippingOption;
  total: number;
  finalTotal: number;
  onValidate: () => boolean;
  disabled?: boolean;
}

export function CheckoutStandard({ formData, selectedShipping, total, finalTotal, onValidate, disabled }: CheckoutStandardProps) {
  const router = useRouter();
  const { items } = useCart();
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAfterpayReady, setIsAfterpayReady] = useState(false);

  const checkoutMode: CheckoutMode = config.standardCheckout.method === "popup" ? "popup" : "redirect";

  // Refs to keep current values accessible in async callbacks
  const itemsRef = useRef(items);
  const finalTotalRef = useRef(finalTotal);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { finalTotalRef.current = finalTotal; }, [finalTotal]);

  // Check if Afterpay.js is loaded
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay) {
        setIsAfterpayReady(true);
      } else {
        timeoutId = setTimeout(checkAfterpay, 100);
      }
    };
    checkAfterpay();
    return () => clearTimeout(timeoutId);
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

        // Read capture mode from centralized config
        const isImmediateCapture = config.captureMode === "immediate";

        try {
          const result = isImmediateCapture
            ? await captureFullPaymentClient(event.data.orderToken)
            : await authorizePaymentClient(event.data.orderToken);

          const orderId = result.orderId;

          updateFlowSummary({
            responseData: {
              'data.orderToken': event.data.orderToken,
              id: result.data.id,
              status: result.data.status,
              originalAmount: result.data.originalAmount,
              openToCaptureAmount: result.data.openToCapture,
            },
          });

          // Store pending order in sessionStorage (confirmation page handles saveOrder)
          const currentItems = itemsRef.current;
          sessionStorage.setItem(STORAGE_KEYS.PENDING_ORDER, JSON.stringify({
            items: currentItems.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
            })),
            total: finalTotalRef.current,
          }));

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
  }, [router, config.captureMode]);

  const handleSubmit = async () => {
    if (!onValidate()) return;

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

      const startTime = Date.now();
      const response = await fetch("/api/afterpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutClientRequest),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

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
        // Store pending order before redirect
        sessionStorage.setItem(STORAGE_KEYS.PENDING_ORDER, JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
          total: finalTotal,
        }));

        addFlowLog({
          type: "redirect",
          label: "Redirect to Afterpay",
          endpoint: data.redirectCheckoutUrl,
        });

        window.location.href = data.redirectCheckoutUrl;
      } else {
        // Popup mode - popup is already open, transfer token
        if (!window.Afterpay) {
          throw new Error("Afterpay.js not loaded");
        }

        addFlowLog({
          type: "callback",
          label: "Transfer token to popup",
          data: { token: data.token.substring(0, 20) + "..." },
        });

        window.Afterpay.transfer({ token: data.token });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <AfterpayButton
        variant="pay"
        onClick={handleSubmit}
        disabled={disabled || isLoading || !isAfterpayReady}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
