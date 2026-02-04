"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Checkout error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-afterpay-gray-900 dark:text-white">
          Checkout Error
        </h2>
        <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          There was a problem with your checkout. Your cart is still saved.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-afterpay-mint text-afterpay-black font-medium rounded-lg hover:bg-afterpay-mint-dark transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/cart"
            className="w-full px-4 py-3 bg-white dark:bg-afterpay-gray-800 text-afterpay-gray-900 dark:text-white font-medium rounded-lg border border-afterpay-gray-300 dark:border-afterpay-gray-600 hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700 transition-colors text-center"
          >
            Return to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
