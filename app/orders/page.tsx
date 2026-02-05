"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOrders, clearOrders, deleteOrder, formatOrderDate, Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { formatFlowName } from "@/lib/flowLogs";

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    authorized: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    captured: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    voided: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function CaptureModeTag({ mode }: { mode: "deferred" | "immediate" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        mode === "deferred"
          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
          : "bg-afterpay-mint/20 text-afterpay-black dark:text-afterpay-mint"
      }`}
    >
      {mode === "deferred" ? "Deferred" : "Immediate"}
    </span>
  );
}

function OrderCard({ order, onDelete }: { order: Order; onDelete: (orderId: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="bg-white dark:bg-afterpay-gray-800 rounded-lg shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 overflow-hidden">
      {/* Order Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="font-mono text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">
              {order.orderId}
            </p>
            <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-500">
              {formatOrderDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold">{formatPrice(order.total)}</p>
            <div className="flex items-center gap-2 mt-1">
              <OrderStatusBadge status={order.status} />
              <CaptureModeTag mode={order.captureMode} />
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 text-afterpay-gray-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Order Details (Expandable) */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 bg-afterpay-gray-50 dark:bg-afterpay-gray-800/50">
          {/* Flow Info */}
          <div className="mb-4">
            <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">
              <span className="font-medium">Checkout Flow:</span>{" "}
              <span>{formatFlowName(order.flow)}</span>
            </p>
          </div>

          {/* Items List */}
          {order.items.length > 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-afterpay-gray-700 dark:text-afterpay-gray-300">
                Items:
              </p>
              {order.items.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex justify-between text-sm"
                >
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                    {item.productName} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400 mb-4">
              No item details available
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/admin?orderId=${order.orderId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-afterpay-black dark:text-afterpay-mint hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Manage in Admin
            </Link>

            {/* Delete Button */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">Delete?</span>
                <button
                  onClick={() => onDelete(order.orderId)}
                  className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 bg-afterpay-gray-200 dark:bg-afterpay-gray-600 text-afterpay-gray-700 dark:text-afterpay-gray-300 text-xs font-medium rounded hover:bg-afterpay-gray-300 dark:hover:bg-afterpay-gray-500 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1 text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setOrders(getOrders());
    setMounted(true);
  }, []);

  const handleClearHistory = () => {
    clearOrders();
    setOrders([]);
    setShowClearConfirm(false);
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
    setOrders(orders.filter(o => o.orderId !== orderId));
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-afterpay-gray-50 dark:bg-afterpay-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-afterpay-gray-50 dark:bg-afterpay-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold">Order History</h1>
          </div>
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
            View your recent Afterpay orders from this demo. Orders are stored
            locally in your browser.
          </p>
        </div>

        {/* Actions */}
        {orders.length > 0 && (
          <div className="flex justify-end mb-6">
            {showClearConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">
                  Clear all order history?
                </span>
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-afterpay-gray-200 dark:bg-afterpay-gray-700 text-afterpay-gray-700 dark:text-afterpay-gray-300 text-sm font-medium rounded-lg hover:bg-afterpay-gray-300 dark:hover:bg-afterpay-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
        )}

        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Demo Notice:</strong> Orders are stored in your
              browser&apos;s localStorage and are not sent to any server.
              Clearing your browser data will remove this history.
            </p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onDelete={handleDeleteOrder} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-afterpay-gray-800 rounded-lg shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-afterpay-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-6">
              Complete a checkout to see your order history here.
            </p>
            <Link
              href="/checkout"
              className="inline-block px-6 py-3 bg-afterpay-black dark:bg-afterpay-mint text-white dark:text-afterpay-black font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-mint/90 transition-colors"
            >
              Start a Checkout
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
