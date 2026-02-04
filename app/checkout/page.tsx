"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { CheckoutExpress } from "@/components/CheckoutExpress";
import { CheckoutStandard } from "@/components/CheckoutStandard";
import { DevPanel, useDevPanel } from "@/components/DevPanel";

type CheckoutMethod = "express" | "standard";

export default function CheckoutPage() {
  const { items, total } = useCart();
  const [method, setMethod] = useState<CheckoutMethod>("express");
  const [showDevPanel, setShowDevPanel] = useState(true);
  const { logs, addLog, updateLog, clearLogs } = useDevPanel();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-afterpay-gray-600 mb-6">
          Add some products before checking out
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className={`${showDevPanel ? "pb-72" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-afterpay-gray-600">
              {items.length} {items.length === 1 ? "item" : "items"} -{" "}
              {formatPrice(total)}
            </p>
          </div>
          <Link
            href="/cart"
            className="text-afterpay-gray-600 hover:text-afterpay-black"
          >
            Edit Cart
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Method Toggle */}
            <div className="mb-8">
              <div className="flex border-b border-afterpay-gray-200">
                <button
                  onClick={() => setMethod("express")}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
                    method === "express"
                      ? "text-afterpay-black"
                      : "text-afterpay-gray-500 hover:text-afterpay-gray-700"
                  }`}
                >
                  Express Checkout
                  <span className="block text-xs font-normal mt-1">
                    Afterpay.js Popup
                  </span>
                  {method === "express" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-afterpay-mint" />
                  )}
                </button>
                <button
                  onClick={() => setMethod("standard")}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
                    method === "standard"
                      ? "text-afterpay-black"
                      : "text-afterpay-gray-500 hover:text-afterpay-gray-700"
                  }`}
                >
                  Standard Checkout
                  <span className="block text-xs font-normal mt-1">
                    API Integration
                  </span>
                  {method === "standard" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-afterpay-mint" />
                  )}
                </button>
              </div>
            </div>

            {/* Method Description */}
            <div className="bg-afterpay-gray-50 rounded-lg p-4 mb-6">
              {method === "express" ? (
                <div>
                  <h3 className="font-medium mb-2">Express Checkout Flow</h3>
                  <p className="text-sm text-afterpay-gray-600">
                    Uses Afterpay.js to open a popup where customers can quickly
                    complete their purchase. Supports integrated shipping
                    (options shown in popup) or deferred shipping (options shown
                    on your site).
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium mb-2">Standard Checkout Flow</h3>
                  <p className="text-sm text-afterpay-gray-600">
                    Server-side API integration with full control over the
                    checkout experience. Uses Auth + Capture flow for flexible
                    payment processing - authorize now, capture up to 13 days
                    later.
                  </p>
                </div>
              )}
            </div>

            {/* Checkout Form */}
            {method === "express" ? (
              <CheckoutExpress onLog={addLog} onLogUpdate={updateLog} />
            ) : (
              <CheckoutStandard onLog={addLog} onLogUpdate={updateLog} />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-afterpay-gray-50 rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-afterpay-gray-200 rounded flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-afterpay-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-afterpay-gray-500">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-afterpay-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-afterpay-gray-500">
                  <span>Shipping</span>
                  <span>Calculated next</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-afterpay-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Developer Mode Toggle */}
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDevPanel}
                  onChange={(e) => setShowDevPanel(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-afterpay-gray-600">
                  Show Developer Panel
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Panel */}
      {showDevPanel && <DevPanel logs={logs} onClear={clearLogs} />}
    </div>
  );
}
