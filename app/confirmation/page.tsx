"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { getFlowLogs, FlowLogs, FlowLogEntry } from "@/lib/flowLogs";
import { CheckoutProgress } from "@/components/CheckoutProgress";

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

  const getLogIcon = (type: FlowLogEntry["type"]) => {
    switch (type) {
      case "api_request":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        );
      case "api_response":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        );
      case "callback":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
      case "redirect":
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    const isSuccess = status >= 200 && status < 300;
    return (
      <span
        className={`text-xs font-mono px-2 py-0.5 rounded ${
          isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {status}
      </span>
    );
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500"
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
          <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
          <p className="text-afterpay-gray-600 mb-6">{error}</p>
          <Link
            href="/checkout"
            className="inline-block px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
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
              getLogIcon={getLogIcon}
              getStatusBadge={getStatusBadge}
            />
          </div>
        )}
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">No order found</h1>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
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
          orderDetails.status === "CAPTURED" ? "bg-afterpay-mint" : "bg-blue-100"
        }`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-10 w-10 ${
              orderDetails.status === "CAPTURED" ? "text-afterpay-black" : "text-blue-600"
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
        <h1 className="text-3xl font-bold mb-2">
          {orderDetails.status === "CAPTURED"
            ? "Thank you for your order!"
            : "Payment Authorized!"}
        </h1>
        <p className="text-afterpay-gray-600">
          {orderDetails.status === "CAPTURED"
            ? "Your payment has been processed successfully."
            : "Your payment has been authorized and is awaiting capture from the Admin Panel."}
        </p>
      </div>

      {/* Deferred Capture Notice */}
      {orderDetails.status === "AUTHORIZED" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 font-medium">Deferred Capture Mode</p>
              <p className="text-blue-700 text-sm mt-1">
                This payment has been authorized but not yet captured. The merchant can capture the payment
                within 13 days using the Admin Panel.
              </p>
              <Link
                href={`/admin?orderId=${orderDetails.orderId}`}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
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
      <div className="bg-afterpay-gray-50 rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Order Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600">Order ID</dt>
            <dd className="font-mono text-sm">{orderDetails.orderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600">Status</dt>
            <dd>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                orderDetails.status === "CAPTURED"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {orderDetails.status}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-afterpay-gray-600">Checkout Flow</dt>
            <dd className="capitalize">{orderDetails.flow.replace(/-/g, " ")}</dd>
          </div>
        </dl>
      </div>

      {/* Integration Flow Logs */}
      {flowLogs && flowLogs.entries.length > 0 && (
        <FlowLogsSection
          flowLogs={flowLogs}
          expandedLogs={expandedLogs}
          toggleLogExpanded={toggleLogExpanded}
          getLogIcon={getLogIcon}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Link
          href="/"
          className="flex-1 py-3 px-6 bg-afterpay-black text-white text-center font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          href="/checkout"
          className="flex-1 py-3 px-6 bg-white text-afterpay-black text-center font-medium rounded-lg border-2 border-afterpay-black hover:bg-afterpay-gray-50 transition-colors"
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
  getLogIcon,
  getStatusBadge,
}: {
  flowLogs: FlowLogs;
  expandedLogs: Set<string>;
  toggleLogExpanded: (id: string) => void;
  getLogIcon: (type: FlowLogEntry["type"]) => React.ReactNode;
  getStatusBadge: (status?: number) => React.ReactNode;
}) {
  const flowName = flowLogs.flow === "express-integrated"
    ? "Express Checkout (Integrated Shipping)"
    : flowLogs.flow === "express-deferred"
    ? "Express Checkout (Deferred Shipping)"
    : "Standard Checkout (API)";

  return (
    <div className="bg-afterpay-gray-900 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-afterpay-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-afterpay-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Integration Flow
        </h2>
        <p className="text-sm text-afterpay-gray-400 mt-1">{flowName}</p>
      </div>

      <div className="p-6">
        {/* Timeline */}
        <div className="relative">
          {flowLogs.entries.map((entry, index) => (
            <div key={entry.id} className="relative pl-12 pb-6 last:pb-0">
              {/* Timeline line */}
              {index < flowLogs.entries.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-afterpay-gray-700" />
              )}

              {/* Icon */}
              <div className="absolute left-0 top-0">{getLogIcon(entry.type)}</div>

              {/* Content */}
              <button
                onClick={() => toggleLogExpanded(entry.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{entry.label}</span>
                  {getStatusBadge(entry.status)}
                  {entry.duration && (
                    <span className="text-xs text-afterpay-gray-500">
                      {entry.duration}ms
                    </span>
                  )}
                </div>
                {entry.endpoint && (
                  <p className="text-xs text-afterpay-gray-400 font-mono">
                    {entry.method && `${entry.method} `}{entry.endpoint}
                  </p>
                )}
                <p className="text-xs text-afterpay-gray-500 mt-1">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </button>

              {/* Expanded data */}
              {expandedLogs.has(entry.id) && entry.data && (
                <div className="mt-3 bg-afterpay-gray-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 whitespace-pre-wrap">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-afterpay-gray-700">
          <p className="text-xs text-afterpay-gray-500 mb-3">Click on any step to view request/response data</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-100" />
              <span className="text-afterpay-gray-400">API Request</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100" />
              <span className="text-afterpay-gray-400">API Response</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-100" />
              <span className="text-afterpay-gray-400">Callback/Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-100" />
              <span className="text-afterpay-gray-400">Redirect</span>
            </div>
          </div>
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
          <p className="text-afterpay-gray-600">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
