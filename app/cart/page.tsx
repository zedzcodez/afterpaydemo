"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { OSMPlacement } from "@/components/OSMPlacement";
import { getCartSkus, getCartCategories } from "@/lib/cart";

export default function CartPage() {
  const { items, total, updateQuantity, removeFromCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-afterpay-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-afterpay-gray-600 mb-6">
          Add some products to get started
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-4 p-4 bg-white dark:bg-afterpay-gray-800 border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg"
              >
                {/* Product Image */}
                <div className="w-24 h-24 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="font-medium text-afterpay-black dark:text-white hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">
                    {item.product.category}
                  </p>
                  <p className="font-medium mt-1">
                    {formatPrice(item.product.price, item.product.currency)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="w-8 h-8 rounded-full border border-afterpay-gray-300 dark:border-afterpay-gray-600 flex items-center justify-center hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="w-8 h-8 rounded-full border border-afterpay-gray-300 dark:border-afterpay-gray-600 flex items-center justify-center hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <p className="font-semibold">
                    {formatPrice(
                      item.product.price * item.quantity,
                      item.product.currency
                    )}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-afterpay-gray-400 hover:text-red-500 transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-afterpay-gray-600 dark:text-afterpay-gray-300">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-afterpay-gray-600 dark:text-afterpay-gray-300">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-3">
                <div className="flex justify-between text-lg font-semibold dark:text-white">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Afterpay OSM - Below Total (light background for widget visibility) */}
            <div className="mb-6 p-4 bg-afterpay-gray-50 rounded-lg border border-afterpay-gray-200">
              <OSMPlacement
                pageType="cart"
                amount={total}
                currency="USD"
                itemSkus={getCartSkus(items)}
                itemCategories={getCartCategories(items)}
              />
            </div>

            <Link
              href="/checkout"
              className="block w-full py-3 px-6 bg-afterpay-black text-white text-center font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/"
              className="block w-full mt-3 py-3 px-6 text-afterpay-gray-600 dark:text-afterpay-gray-400 text-center hover:text-afterpay-black dark:hover:text-white transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
