"use client";

/**
 * Cash App Pay Payment Button
 *
 * Pre-initializes the Cash App Pay SDK when this payment method is selected
 * and the form is valid. The user's single click on the SDK button directly
 * launches the QR code / Cash App flow — no programmatic click needed.
 *
 * Flow: selected + form valid → create token → initializeForCashAppPay → SDK button is live
 *       → user clicks SDK button → QR code appears
 *
 * Form data is managed by the parent checkout page and passed via props.
 */

import { useState, useEffect, useRef, useCallback } from "react";

import { useCart } from "./CartProvider";
import { useConfig } from "@/components/ConfigProvider";
import { initFlowLogs, addFlowLog, setFlowSummary, updateFlowSummary, FLOW_SUMMARIES } from "@/lib/flowLogs";
import { captureFullPaymentClient, authorizePaymentClient } from "@/lib/payment-client";
import { CashAppPayCompleteEvent } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { SDK_POLL_INTERVAL_MS } from "@/lib/constants";
import type { CheckoutFormData, LocalShippingOption } from "@/lib/types";

const CASH_APP_BUTTON_OPTIONS = {
  size: "medium" as const,
  width: "full" as const,
  theme: "dark" as const,
  shape: "semiround" as const,
};

// The SDK renders its button inside an open shadow DOM and may not respect
// the width/shape options. Polls with setTimeout (not rAF — the SDK can
// take 100+ ms to render after initializeForCashAppPay) until the shadow
// DOM button exists, then injects a style override.
function applyCashAppButtonStyles(retries = 30) {
  const host = document.querySelector('#cash-app-pay > div');
  if (!host?.shadowRoot) {
    if (retries > 0) setTimeout(() => applyCashAppButtonStyles(retries - 1), SDK_POLL_INTERVAL_MS);
    return;
  }
  const shadow = host.shadowRoot;
  // Remove existing override if the SDK re-rendered the shadow DOM
  const existing = shadow.querySelector('#cap-style-override');
  if (existing) existing.remove();
  const btn = shadow.querySelector('button[data-testid="cap-btn"]');
  if (!btn) {
    if (retries > 0) setTimeout(() => applyCashAppButtonStyles(retries - 1), SDK_POLL_INTERVAL_MS);
    return;
  }
  const style = document.createElement('style');
  style.id = 'cap-style-override';
  style.textContent = `
    button[data-testid="cap-btn"] {
      width: 100% !important;
      height: 48px !important;
      border-radius: 12px !important;
    }
  `;
  shadow.appendChild(style);
}

interface CheckoutCashAppProps {
  formData: CheckoutFormData;
  selectedShipping: LocalShippingOption;
  total: number;
  finalTotal: number;
  onValidate: () => boolean;
  disabled?: boolean;
  /** When true, pre-initializes the SDK so button is ready for single click */
  selected?: boolean;
}

export function CheckoutCashApp({ formData, selectedShipping, total, finalTotal, onValidate, disabled, selected }: CheckoutCashAppProps) {

  const { items } = useCart();
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [buttonRendered, setButtonRendered] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const initializingRef = useRef(false);

  // Refs to keep current values accessible in async callbacks
  const itemsRef = useRef(items);
  const totalRef = useRef(finalTotal);
  const captureModeRef = useRef(config.captureMode);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { totalRef.current = finalTotal; }, [finalTotal]);
  useEffect(() => { captureModeRef.current = config.captureMode; }, [config.captureMode]);

  // Poll for SDK readiness (initializeForCashAppPay)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const checkAfterpay = () => {
      if (typeof window !== "undefined" && window.Afterpay && typeof window.Afterpay.initializeForCashAppPay === 'function') {
        setIsReady(true);
      } else {
        timeoutId = setTimeout(checkAfterpay, SDK_POLL_INTERVAL_MS);
      }
    };
    checkAfterpay();
    return () => clearTimeout(timeoutId);
  }, []);

  // Cleanup: restart Cash App Pay when component unmounts
  useEffect(() => {
    return () => {
      if (window.Afterpay?.restartCashAppPay) {
        window.Afterpay.restartCashAppPay();
      }
    };
  }, []);

  // Reset SDK state when deselected so re-selection triggers fresh initialization
  useEffect(() => {
    if (!selected && isInitialized) {
      if (window.Afterpay?.restartCashAppPay) {
        window.Afterpay.restartCashAppPay();
      }
      initializingRef.current = false;
      setIsInitialized(false);
      setButtonRendered(false);
      setError(null);
      setIsLoading(false);
    }
  }, [selected, isInitialized]);

  // onComplete handler for Cash App Pay
  const handleComplete = useCallback(async (event: CashAppPayCompleteEvent) => {
    addFlowLog({
      type: "callback",
      label: "Cash App Pay onComplete",
      data: { status: event.data.status, cashtag: event.data.cashtag },
    });

    if (event.data.status !== "SUCCESS") {
      setError("Payment was not completed");
      setIsLoading(false);
      setProcessingStep(null);
      return;
    }

    setIsLoading(true);
    setProcessingStep("Authorizing payment...");

    try {
      const captureMode = captureModeRef.current;
      const isImmediateCapture = captureMode === "immediate";

      if (isImmediateCapture) {
        setProcessingStep("Capturing payment...");
      }

      const result = isImmediateCapture
        ? await captureFullPaymentClient(event.data.orderToken)
        : await authorizePaymentClient(event.data.orderToken);

      const orderId = result.orderId;

      updateFlowSummary({
        responseData: {
          'data.orderToken': event.data.orderToken,
          id: result.data.id,
          status: result.data.status || (isImmediateCapture ? 'CAPTURED' : result.data.status),
          originalAmount: result.data.originalAmount,
          openToCaptureAmount: result.data.openToCapture,
        },
      });

      // Store pending order in sessionStorage
      const currentItems = itemsRef.current;
      sessionStorage.setItem(STORAGE_KEYS.PENDING_ORDER, JSON.stringify({
        items: currentItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: totalRef.current,
      }));

      setProcessingStep("Redirecting...");
      const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
      addFlowLog({
        type: "redirect",
        label: "Redirect to Confirmation",
        endpoint: `/confirmation?orderId=${orderId}&status=success&flow=cashapp-${flowSuffix}`,
      });

      // Full page navigation instead of SPA router.push — Cash App Pay Kit
      // can only be loaded once per page lifecycle. SPA navigation preserves
      // the loaded Pay Kit, causing "Pay Kit should not be loaded again" errors
      // on subsequent orders. Full navigation clears all SDK state cleanly.
      window.location.href = `/confirmation?orderId=${orderId}&status=success&flow=cashapp-${flowSuffix}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment processing failed");
      setIsLoading(false);
      setProcessingStep(null);
    }
  }, []);

  // Pre-initialize SDK when selected + form valid + SDK ready
  // This creates a checkout token and initializes the SDK so the button
  // is ready for a single click to launch the QR code.
  useEffect(() => {
    if (!selected || disabled || !isReady || isInitialized || initializingRef.current) return;

    const initialize = async () => {
      initializingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Initialize flow logs
      initFlowLogs('cashapp');
      setFlowSummary({
        ...FLOW_SUMMARIES["cashapp"],
        requestConfig: {},
        responseData: {},
      });

      try {
        // Per Cash App Pay docs: always restart before a new checkout request.
        // restartCashAppPay() clears prior authorizations, charged amounts,
        // and all Cash App Pay UI elements (button, QR modal, cashtag display).
        // https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview#restarting-cash-app-pay-for-a-new-checkout-request
        if (window.Afterpay?.restartCashAppPay) {
          window.Afterpay.restartCashAppPay();
        }
        // Clear the container — restartCashAppPay removes SDK elements but
        // orphaned DOM nodes can remain across SPA navigations
        const cashAppDiv = document.getElementById('cash-app-pay');
        if (cashAppDiv) cashAppDiv.replaceChildren();

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

        // Extract request config for flow summary
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

        // Step 2: Re-render Cash App Pay button after restart
        // Per docs: restartCashAppPay() clears all UI, so always re-render
        if (window.Afterpay?.renderCashAppPayButton) {
          window.Afterpay.renderCashAppPayButton({
            countryCode: "US",
            cashAppPayButtonOptions: CASH_APP_BUTTON_OPTIONS,
          });
          setButtonRendered(true);
        }

        // Step 3: Initialize Cash App Pay SDK with the token
        addFlowLog({
          type: "callback",
          label: "Initialize Cash App Pay",
          data: { countryCode: "US", token: data.token.substring(0, 20) + "..." },
        });

        if (!window.Afterpay) {
          throw new Error("Afterpay SDK was unloaded during initialization");
        }
        window.Afterpay.initializeForCashAppPay({
          countryCode: "US",
          token: data.token,
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

        setIsInitialized(true);
        setIsLoading(false);

        // Apply button styles after initialization — use setTimeout since
        // the SDK may take time to re-render the button in the shadow DOM
        setTimeout(() => applyCashAppButtonStyles(), 200);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Initialization failed";
        setError(msg);
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- buttonRendered excluded: restart always re-renders
  }, [selected, disabled, isReady, isInitialized, items, finalTotal, formData, handleComplete, retryCount]);

  // Handle retry after error — reset SDK state and re-initialize
  const handleRetry = () => {
    if (window.Afterpay?.restartCashAppPay) {
      window.Afterpay.restartCashAppPay();
    }
    initializingRef.current = false;
    setIsInitialized(false);
    setButtonRendered(false);
    setError(null);
    setIsLoading(false);
    setProcessingStep(null);
    setRetryCount(c => c + 1);
  };

  return (
    <div className="space-y-2">
      {/* SDK renders the Cash App Pay button here — clicks go directly to SDK.
          Hidden when error is set to prevent broken SDK UI ($CASHTAG_C_TOKEN) from showing. */}
      <div className="relative">
        <div id="cash-app-pay" className={error ? "hidden" : ""} />

        {/* Loading overlay while creating token + initializing (before user interaction) */}
        {isLoading && !processingStep && (
          <div className="absolute inset-0 bg-white/80 dark:bg-afterpay-gray-900/80 flex items-center justify-center rounded-xl z-10">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-afterpay-mint border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">Initializing Cash App Pay...</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment processing progress bar (after user authorizes via Cash App) */}
      {processingStep && (
        <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 border border-afterpay-gray-200 dark:border-afterpay-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-afterpay-black dark:text-white">{processingStep}</span>
            <span className="w-4 h-4 border-2 border-afterpay-mint border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="w-full bg-afterpay-gray-200 dark:bg-afterpay-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-afterpay-mint rounded-full animate-pulse" style={{ width: processingStep.includes("Redirect") ? "100%" : processingStep.includes("Captur") ? "75%" : "40%" }} />
          </div>
        </div>
      )}

      {/* Error display with retry */}
      {error && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-2 text-sm font-medium text-afterpay-mint hover:underline"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
