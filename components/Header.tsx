"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-afterpay-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-afterpay-mint rounded-full flex items-center justify-center">
              <span className="text-afterpay-black font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-lg">Afterpay Demo Shop</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-afterpay-gray-600 hover:text-afterpay-black transition-colors"
            >
              Shop
            </Link>
            <Link
              href="/checkout"
              className="text-afterpay-gray-600 hover:text-afterpay-black transition-colors"
            >
              Checkout Demo
            </Link>
            <Link
              href="/admin"
              className="text-afterpay-gray-600 hover:text-afterpay-black transition-colors"
            >
              Admin
            </Link>
          </nav>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center space-x-1 text-afterpay-gray-600 hover:text-afterpay-black transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-afterpay-mint text-afterpay-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
