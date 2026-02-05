"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { CheckoutExpress } from "@/components/CheckoutExpress";
import { CheckoutStandard } from "@/components/CheckoutStandard";
import { CheckoutProgress } from "@/components/CheckoutProgress";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";
import { OSMInfoSection } from "@/components/OSMInfoSection";
import { getCartSkus, getCartCategories } from "@/lib/cart";

type CheckoutMethod = "express" | "standard";
type ShippingFlow = "integrated" | "deferred";

export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
}

export default function CheckoutPage() {
  const { items, total } = useCart();
  const searchParams = useSearchParams();

  // Read initial values from URL params
  const initialMethod = searchParams.get("method") as CheckoutMethod | null;
  const initialShipping = searchParams.get("shipping") as ShippingFlow | null;

  const [method, setMethod] = useState<CheckoutMethod>(initialMethod || "express");
  const [initialShippingFlow] = useState<ShippingFlow | undefined>(initialShipping || undefined);

  // Shipping state for Order Summary - only used in Standard Checkout
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingAnimationKey, setShippingAnimationKey] = useState(0);

  // Handle shipping change from Standard Checkout
  const handleShippingChange = useCallback((option: ShippingOption) => {
    setSelectedShipping(option);
    setShippingAnimationKey((prev) => prev + 1);
  }, []);

  // Reset shipping when switching to Express (shipping happens in popup or /shipping page)
  useEffect(() => {
    if (method === "express") {
      setSelectedShipping(null);
    }
  }, [method]);

  // Calculate final total including shipping
  const finalTotal = total + (selectedShipping?.price ?? 0);

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
    <div className="pb-16">
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
            className="text-afterpay-gray-600 hover:text-afterpay-black dark:hover:text-white"
          >
            Edit Cart
          </Link>
        </div>

        {/* Progress Timeline */}
        <CheckoutProgress currentStep="checkout" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Method Toggle */}
            <div className="mb-8">
              <div className="relative flex border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
                {/* Sliding indicator */}
                <div
                  className="absolute bottom-0 h-0.5 bg-afterpay-mint transition-all duration-300 ease-out"
                  style={{
                    width: "50%",
                    transform: method === "express" ? "translateX(0)" : "translateX(100%)",
                  }}
                />
                <button
                  onClick={() => setMethod("express")}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    method === "express"
                      ? "text-afterpay-black dark:text-white"
                      : "text-afterpay-gray-500 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
                  }`}
                >
                  Express Checkout
                  <span className="block text-xs font-normal mt-1">
                    Afterpay.js Popup
                  </span>
                </button>
                <button
                  onClick={() => setMethod("standard")}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                    method === "standard"
                      ? "text-afterpay-black dark:text-white"
                      : "text-afterpay-gray-500 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
                  }`}
                >
                  Standard Checkout
                  <span className="block text-xs font-normal mt-1">
                    API Integration
                  </span>
                </button>
              </div>
            </div>

            {/* Method Description */}
            <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 mb-6">
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
              <CheckoutExpress
                initialShippingFlow={initialShippingFlow}
              />
            ) : (
              <CheckoutStandard
                onShippingChange={handleShippingChange}
              />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded overflow-hidden relative flex-shrink-0">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
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
              <div className="border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div
                  key={`shipping-${shippingAnimationKey}`}
                  className={`flex justify-between text-sm rounded -mx-2 px-2 py-1 ${
                    selectedShipping ? "text-afterpay-black dark:text-white" : "text-afterpay-gray-500"
                  } ${shippingAnimationKey > 0 ? "animate-highlight-update" : ""}`}
                >
                  <span>Shipping</span>
                  <span>
                    {selectedShipping
                      ? selectedShipping.price === 0
                        ? "FREE"
                        : formatPrice(selectedShipping.price)
                      : "Calculated next"}
                  </span>
                </div>
                <div
                  key={`total-${shippingAnimationKey}`}
                  className={`flex justify-between font-semibold text-lg pt-2 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded -mx-2 px-2 py-1 ${
                    shippingAnimationKey > 0 ? "animate-highlight-update" : ""
                  }`}
                >
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
                <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 pt-1">
                  Includes all applicable taxes, discounts, and promotions
                </p>
              </div>

              {/* Afterpay OSM & Developer Info */}
              <div className="mt-6 pt-6 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
                <OSMInfoSection
                  pageType="cart"
                  amount={finalTotal}
                  currency="USD"
                  productSku={getCartSkus(items)}
                  productCategory={getCartCategories(items)}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Developer Panel */}
      <FlowLogsDevPanel />
    </div>
  );
}
