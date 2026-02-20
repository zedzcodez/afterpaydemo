"use client";

import Link from "next/link";
import { FlowLogs, formatFlowName } from "@/lib/flowLogs";
import { CheckoutProgress } from "@/components/CheckoutProgress";
import { FlowLogsSection } from "./FlowLogsSection";

interface OrderDetails {
  orderId: string;
  status: string;
  flow: string;
}

interface OrderSuccessSectionProps {
  orderDetails: OrderDetails;
  developerMode: boolean;
  flowLogs: FlowLogs | null;
  expandedLogs: Set<string>;
  toggleLogExpanded: (id: string) => void;
}

export function OrderSuccessSection({
  orderDetails,
  developerMode,
  flowLogs,
  expandedLogs,
  toggleLogExpanded,
}: OrderSuccessSectionProps) {
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
        <h1 className="text-3xl font-display font-bold mb-2 dark:text-white">
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
        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl p-4 mb-8">
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
      <div className="bg-afterpay-gray-50 dark:bg-slate-800 rounded-xl p-6 mb-8">
        <h2 className="font-display font-semibold mb-4 dark:text-white">Order Details</h2>
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

      {/* Integration Flow Logs (developer mode only) */}
      {developerMode && flowLogs && flowLogs.entries.length > 0 && (
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
          href="/#products"
          className="flex-1 py-3 px-6 bg-white dark:bg-afterpay-gray-800 text-afterpay-black dark:text-white text-center font-medium rounded-lg border-2 border-afterpay-black dark:border-afterpay-gray-600 hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700 transition-colors"
        >
          Try Another Flow
        </Link>
      </div>
    </div>
  );
}
