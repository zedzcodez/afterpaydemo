"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { getFlowLogs, FlowLogs, FlowLogEntry } from "@/lib/flowLogs";
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
            <dd className="capitalize dark:text-white">{orderDetails.flow.replace(/-/g, " ")}</dd>
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

function FlowLogsSection({
  flowLogs,
  expandedLogs,
  toggleLogExpanded,
}: {
  flowLogs: FlowLogs;
  expandedLogs: Set<string>;
  toggleLogExpanded: (id: string) => void;
}) {
  const flowName = flowLogs.flow === "express-integrated"
    ? "Express Checkout (Integrated Shipping)"
    : flowLogs.flow === "express-deferred"
    ? "Express Checkout (Deferred Shipping)"
    : "Standard Checkout (API)";

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

      {/* Timeline */}
      <div className="p-6">
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
