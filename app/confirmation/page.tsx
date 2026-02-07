"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { getFlowLogs, FlowLogs, FlowLogEntry, FlowSummary, formatFlowName } from "@/lib/flowLogs";
import { CheckoutProgress } from "@/components/CheckoutProgress";
import { saveOrder, Order, OrderItem } from "@/lib/orders";
import { getStoredCart, calculateTotal } from "@/lib/cart";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    status: string;
    flow: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowLogs, setFlowLogs] = useState<FlowLogs | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (hasProcessed.current) return;

    // Handle Cash App Pay mobile redirect return
    const isCashAppPayReturn = searchParams.get("cashAppPay") === "true";

    if (isCashAppPayReturn && !hasProcessed.current) {
      hasProcessed.current = true;

      const initListeners = () => {
        if (typeof window !== "undefined" && window.Afterpay?.initializeCashAppPayListeners) {
          window.Afterpay.initializeCashAppPayListeners({
            onComplete: async (event) => {
              if (event.data.status === "SUCCESS") {
                try {
                  // Auth the payment
                  const authResponse = await fetch("/api/afterpay/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: event.data.orderToken }),
                  });
                  const authData = await authResponse.json();

                  if (!authResponse.ok) {
                    setError(authData.error || "Authorization failed");
                    return;
                  }

                  const orderId = authData.id;
                  const captureMode = typeof window !== "undefined"
                    ? localStorage.getItem("afterpay_capture_mode") || "deferred"
                    : "deferred";

                  // Optional immediate capture
                  if (captureMode === "immediate") {
                    const captureResponse = await fetch("/api/afterpay/capture", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId,
                        amount: parseFloat(authData.originalAmount?.amount || "0"),
                        currency: authData.originalAmount?.currency || "USD",
                      }),
                    });
                    if (!captureResponse.ok) {
                      const captureError = await captureResponse.json();
                      setError(captureError.error || "Capture failed");
                      return;
                    }
                  }

                  const isCaptured = captureMode === "immediate";
                  const flow = `cashapp-${captureMode}`;

                  // Save order
                  const pendingOrderData = sessionStorage.getItem('afterpay_pending_order');
                  let orderItems: OrderItem[] = [];
                  let orderTotal = 0;
                  if (pendingOrderData) {
                    try {
                      const parsed = JSON.parse(pendingOrderData);
                      orderItems = parsed.items || [];
                      orderTotal = parsed.total || 0;
                      sessionStorage.removeItem('afterpay_pending_order');
                    } catch { /* fall through */ }
                  }

                  const order: Order = {
                    id: `local-${Date.now()}`,
                    orderId,
                    status: isCaptured ? "captured" : "authorized",
                    total: orderTotal,
                    items: orderItems,
                    createdAt: new Date().toISOString(),
                    flow,
                    captureMode: isCaptured ? "immediate" : "deferred",
                  };
                  saveOrder(order);

                  setOrderDetails({ orderId, status: isCaptured ? "CAPTURED" : "AUTHORIZED", flow });
                  setFlowLogs(getFlowLogs());
                  clearCart();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "An error occurred");
                }
              } else {
                setError("Cash App Pay was cancelled");
                setFlowLogs(getFlowLogs());
              }
            },
          });
        } else {
          setTimeout(initListeners, 100);
        }
      };

      initListeners();
      return;
    }

    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const flow = searchParams.get("flow") || "standard";

    // Confirmation page handles both captured and authorized orders
    // The flow parameter indicates the capture mode:
    // - Ends with "-immediate": Payment was captured
    // - Ends with "-deferred": Payment was only authorized (capture from Admin)
    if (orderId && status === "success") {
      hasProcessed.current = true;
      const isCaptured = flow.endsWith("-immediate");

      // Try to get order data from sessionStorage first (set by review page for standard flow)
      // Fall back to localStorage cart for express flow
      let orderItems: OrderItem[] = [];
      let orderTotal = 0;

      const pendingOrderData = sessionStorage.getItem('afterpay_pending_order');
      if (pendingOrderData) {
        try {
          const parsed = JSON.parse(pendingOrderData);
          orderItems = parsed.items || [];
          orderTotal = parsed.total || 0;
          sessionStorage.removeItem('afterpay_pending_order');
        } catch {
          // Fall back to cart
        }
      }

      // If no pending order data, try cart (for express flow)
      if (orderItems.length === 0) {
        const cartItems = getStoredCart();
        orderItems = cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        }));
        orderTotal = calculateTotal(cartItems);
      }

      const order: Order = {
        id: `local-${Date.now()}`,
        orderId,
        status: isCaptured ? "captured" : "authorized",
        total: orderTotal,
        items: orderItems,
        createdAt: new Date().toISOString(),
        flow,
        captureMode: isCaptured ? "immediate" : "deferred",
      };

      saveOrder(order);

      setOrderDetails({
        orderId,
        status: isCaptured ? "CAPTURED" : "AUTHORIZED",
        flow
      });
      setFlowLogs(getFlowLogs());
      clearCart();
      return;
    }

    // Handle cancelled status
    if (status === "cancelled") {
      hasProcessed.current = true;
      setFlowLogs(getFlowLogs());
      setError("Checkout was cancelled");
    }
  }, [searchParams, clearCart]);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">Payment Failed</h1>
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-6">{error}</p>
          <Link
            href="/checkout"
            className="inline-block px-6 py-3 bg-afterpay-black dark:bg-white text-white dark:text-afterpay-black font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-gray-100 transition-colors"
          >
            Try Again
          </Link>
        </div>

        {/* Show flow logs even on error */}
        {flowLogs && flowLogs.entries.length > 0 && (
          <div className="mt-8">
            <FlowLogsSection
              flowLogs={flowLogs}
              expandedLogs={expandedLogs}
              toggleLogExpanded={toggleLogExpanded}
            />
          </div>
        )}
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">No order found</h1>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-afterpay-black dark:bg-white text-white dark:text-afterpay-black font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-gray-100 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  // Determine which steps to show based on the flow
  const showShipping = orderDetails.flow.includes("deferred");
  const showReview = orderDetails.flow.startsWith("standard");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Progress Timeline */}
      <CheckoutProgress
        currentStep="confirmation"
        showShipping={showShipping}
        showReview={showReview}
      />

      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          orderDetails.status === "CAPTURED" ? "bg-afterpay-mint" : "bg-blue-100 dark:bg-blue-900/30"
        }`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-10 w-10 ${
              orderDetails.status === "CAPTURED" ? "text-afterpay-black" : "text-blue-600 dark:text-blue-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2 dark:text-white">
          {orderDetails.status === "CAPTURED"
            ? "Thank you for your order!"
            : "Payment Authorized!"}
        </h1>
        <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
          {orderDetails.status === "CAPTURED"
            ? "Your payment has been processed successfully."
            : "Your payment has been authorized and is awaiting capture from the Admin Panel."}
        </p>
      </div>

      {/* Deferred Capture Notice */}
      {orderDetails.status === "AUTHORIZED" && (
        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 dark:text-blue-300 font-medium">Deferred Capture Mode</p>
              <p className="text-blue-700 dark:text-slate-400 text-sm mt-1">
                This payment has been authorized but not yet captured. The merchant can capture the payment
                within 13 days using the Admin Panel.
              </p>
              <Link
                href={`/admin?orderId=${orderDetails.orderId}`}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mt-2"
              >
                Go to Admin Panel
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-afterpay-gray-50 dark:bg-slate-800 rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4 dark:text-white">Order Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Order ID</dt>
            <dd className="font-mono text-sm dark:text-white">{orderDetails.orderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Status</dt>
            <dd>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                orderDetails.status === "CAPTURED"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
              }`}>
                {orderDetails.status}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Checkout Flow</dt>
            <dd className="text-right dark:text-white">{formatFlowName(orderDetails.flow)}</dd>
          </div>
        </dl>
      </div>

      {/* Integration Flow Logs */}
      {flowLogs && flowLogs.entries.length > 0 && (
        <FlowLogsSection
          flowLogs={flowLogs}
          expandedLogs={expandedLogs}
          toggleLogExpanded={toggleLogExpanded}
        />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link
          href="/"
          className="flex-1 py-3 px-6 bg-afterpay-black dark:bg-white text-white dark:text-afterpay-black text-center font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-gray-100 transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          href="/checkout"
          className="flex-1 py-3 px-6 bg-white dark:bg-afterpay-gray-800 text-afterpay-black dark:text-white text-center font-medium rounded-lg border-2 border-afterpay-black dark:border-afterpay-gray-600 hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700 transition-colors"
        >
          Try Another Flow
        </Link>
      </div>
    </div>
  );
}

// Documentation links for Afterpay parameters
const DOCS_LINKS: Record<string, string> = {
  mode: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  "merchant.popupOriginUrl": "https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method",
  "merchant.redirectConfirmUrl": "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  "merchant.redirectCancelUrl": "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  shippingOptionRequired: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  isCheckoutAdjusted: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping",
  paymentScheduleChecksum: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping",
  token: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  redirectCheckoutUrl: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  "data.orderToken": "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  id: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  status: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  originalAmount: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  openToCaptureAmount: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
};

function FlowSummarySection({ summary }: { summary: FlowSummary }) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (section: string, data: object) => {
    const output = {
      _disclaimer: "This is a summary of core integration flow data, not an actual Afterpay API response. For raw API requests and responses, expand the timeline entries below.",
      flow: summary.flow,
      description: summary.description,
      steps: summary.steps,
      ...(section === "all" ? {
        requestConfig: summary.requestConfig,
        ...(summary.adjustment ? { adjustment: summary.adjustment } : {}),
        responseData: summary.responseData,
      } : section === "requestConfig" ? {
        requestConfig: summary.requestConfig,
      } : section === "responseData" ? {
        responseData: summary.responseData,
      } : {}),
    };
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string" && value.length > 40) return value.substring(0, 37) + "...";
    return String(value);
  };

  const renderKeyValue = (key: string, value: unknown) => {
    const docsLink = DOCS_LINKS[key];
    return (
      <div key={key} className="flex items-start justify-between gap-4 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 text-xs font-mono truncate">{key}</span>
          {docsLink && (
            <a
              href={docsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-afterpay-mint transition-colors flex-shrink-0"
              title="View Afterpay documentation"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
        <span className="text-emerald-400 text-xs font-mono truncate max-w-[60%] text-right" title={String(value)}>
          {formatValue(value)}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Summary Section */}
      <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Summary</span>
          <button
            onClick={() => copyToClipboard("all", {})}
            className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
          >
            {copiedSection === "all" ? (
              <>
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              "Copy All"
            )}
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-300 mb-3">{summary.description}</p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Steps:</span>
            {summary.steps.map((step, index) => (
              <span key={index} className="flex items-center text-xs text-slate-400">
                {index > 0 && <span className="mx-1 text-slate-600">→</span>}
                <span className="bg-slate-700/50 px-2 py-0.5 rounded">{step}</span>
              </span>
            ))}
          </div>
          <a
            href={summary.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-afterpay-mint hover:text-afterpay-mint-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Afterpay Documentation
          </a>
        </div>
      </div>

      {/* Request Configuration */}
      {Object.keys(summary.requestConfig).length > 0 && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Request Configuration</span>
            <button
              onClick={() => copyToClipboard("requestConfig", summary.requestConfig)}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              {copiedSection === "requestConfig" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-4">
            {Object.entries(summary.requestConfig).map(([key, value]) => renderKeyValue(key, value))}
          </div>
        </div>
      )}

      {/* Checkout Adjustment (for deferred shipping) */}
      {summary.adjustment && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-afterpay-mint/20 overflow-hidden">
          <div className="px-4 py-3 bg-afterpay-mint/10 border-b border-afterpay-mint/20">
            <span className="text-[10px] font-semibold text-afterpay-mint uppercase tracking-wider">Checkout Adjustment (Deferred Shipping)</span>
          </div>
          <div className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Original Amount</span>
                <span className="font-mono">${summary.adjustment.originalAmount.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping ({summary.adjustment.shippingName})</span>
                <span className="font-mono text-emerald-400">+ ${summary.adjustment.shippingAmount.amount}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-medium">
                <span>Adjusted Amount</span>
                <span className="font-mono">${summary.adjustment.adjustedAmount.amount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>checksum validated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Data */}
      {Object.keys(summary.responseData).length > 0 && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Response Data</span>
            <button
              onClick={() => copyToClipboard("responseData", summary.responseData)}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              {copiedSection === "responseData" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-4">
            {Object.entries(summary.responseData).map(([key, value]) => renderKeyValue(key, value))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlowLogsSection({
  flowLogs,
  expandedLogs,
  toggleLogExpanded,
}: {
  flowLogs: FlowLogs;
  expandedLogs: Set<string>;
  toggleLogExpanded: (id: string) => void;
}) {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const flowName = formatFlowName(flowLogs.flow);

  const getLogIcon = (type: FlowLogEntry["type"]) => {
    const iconConfig = {
      api_request: {
        bg: "bg-gradient-to-br from-blue-500 to-blue-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        ),
      },
      api_response: {
        bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        ),
      },
      callback: {
        bg: "bg-gradient-to-br from-violet-500 to-violet-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      redirect: {
        bg: "bg-gradient-to-br from-amber-500 to-orange-500",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        ),
      },
    };

    const config = iconConfig[type];
    return (
      <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shadow-lg shadow-black/20`}>
        {config.icon}
      </div>
    );
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    const isSuccess = status >= 200 && status < 300;
    return (
      <span
        className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
          isSuccess
            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
            : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
        }`}
      >
        {status}
      </span>
    );
  };

  const getTypeLabel = (type: FlowLogEntry["type"]) => {
    const labels = {
      api_request: "REQUEST",
      api_response: "RESPONSE",
      callback: "CALLBACK",
      redirect: "REDIRECT",
    };
    const colors = {
      api_request: "text-blue-400",
      api_response: "text-emerald-400",
      callback: "text-violet-400",
      redirect: "text-amber-400",
    };
    return (
      <span className={`text-[10px] font-bold tracking-wider ${colors[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-white/10">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-afterpay-mint to-emerald-400 flex items-center justify-center shadow-lg shadow-afterpay-mint/20">
              <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Integration Flow</h2>
              <p className="text-xs text-slate-400 mt-0.5">{flowName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {flowLogs.entries.length} steps
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Flow Summary */}
      {flowLogs.summary && (
        <div className="p-6 border-b border-white/5">
          <FlowSummarySection summary={flowLogs.summary} />
        </div>
      )}

      {/* Timeline - Collapsible */}
      <div className="p-6">
        {/* Timeline Header */}
        <button
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/80 rounded-lg hover:bg-slate-800 transition-colors mb-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Events Timeline</span>
            <span className="text-xs bg-afterpay-mint text-slate-900 px-2 py-0.5 rounded-full font-medium">
              {flowLogs.entries.length}
            </span>
            {/* Quick status indicators when collapsed */}
            {!isTimelineExpanded && flowLogs.entries.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                {flowLogs.entries.slice(0, 8).map((entry) => {
                  const colorMap = {
                    api_request: "bg-blue-500",
                    api_response: "bg-emerald-500",
                    callback: "bg-violet-500",
                    redirect: "bg-amber-500",
                  };
                  return (
                    <div
                      key={entry.id}
                      className={`w-2 h-2 rounded-full ${colorMap[entry.type]}`}
                      title={entry.label}
                    />
                  );
                })}
                {flowLogs.entries.length > 8 && (
                  <span className="text-xs text-slate-500 ml-1">+{flowLogs.entries.length - 8}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isTimelineExpanded && flowLogs.entries.length > 0 && (
              <span className="text-xs text-slate-400">
                Latest: {flowLogs.entries[flowLogs.entries.length - 1]?.label.substring(0, 30)}
                {(flowLogs.entries[flowLogs.entries.length - 1]?.label.length || 0) > 30 ? "..." : ""}
              </span>
            )}
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                isTimelineExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Timeline Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isTimelineExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}>
        <div className="relative space-y-1">
          {flowLogs.entries.map((entry, index) => (
            <div key={entry.id} className="relative group">
              {/* Connector line */}
              {index < flowLogs.entries.length - 1 && (
                <div className="absolute left-[13px] top-9 bottom-0 w-px bg-gradient-to-b from-slate-700 to-slate-800" />
              )}

              <button
                onClick={() => toggleLogExpanded(entry.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  expandedLogs.has(entry.id)
                    ? "bg-slate-800/80 ring-1 ring-white/10"
                    : "hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    {getLogIcon(entry.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeLabel(entry.type)}
                      {getStatusBadge(entry.status)}
                      {entry.duration && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {entry.duration}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white mt-1 truncate">
                      {entry.label}
                    </p>
                    {entry.endpoint && (
                      <p className="text-xs text-slate-500 font-mono mt-1 truncate">
                        {entry.method && (
                          <span className="text-slate-400">{entry.method} </span>
                        )}
                        {entry.endpoint}
                      </p>
                    )}
                  </div>

                  {/* Timestamp & expand indicator */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-slate-600 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    <svg
                      className={`w-4 h-4 text-slate-600 mt-1 ml-auto transition-transform duration-200 ${
                        expandedLogs.has(entry.id) ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded data */}
              {expandedLogs.has(entry.id) && entry.data && (
                <div className="ml-10 mt-1 mb-3 rounded-lg bg-slate-950 ring-1 ring-white/5 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Payload
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2));
                      }}
                      className="text-[10px] text-slate-500 hover:text-white transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 scrollbar-thin">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="px-6 py-4 border-t border-white/5 bg-slate-900/30">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Legend:</span>
          {[
            { type: "api_request" as const, label: "Request", color: "from-blue-500 to-blue-600" },
            { type: "api_response" as const, label: "Response", color: "from-emerald-500 to-emerald-600" },
            { type: "callback" as const, label: "Callback", color: "from-violet-500 to-violet-600" },
            { type: "redirect" as const, label: "Redirect", color: "from-amber-500 to-orange-500" },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded bg-gradient-to-br ${item.color}`} />
              <span className="text-[10px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
