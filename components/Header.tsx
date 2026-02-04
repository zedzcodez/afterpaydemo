"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 glass border-b border-afterpay-gray-200/50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-afterpay-mint rounded-xl flex items-center justify-center shadow-mint-glow group-hover:shadow-mint-glow-lg transition-shadow duration-300">
              <span className="text-afterpay-black font-display font-bold text-lg">A</span>
            </div>
            <span className="font-display font-semibold text-lg hidden sm:block">
              Afterpay Demo Shop
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 hover:text-afterpay-black hover:bg-afterpay-mint/20 transition-all duration-200"
            >
              Shop
            </Link>
            <Link
              href="/checkout"
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 hover:text-afterpay-black hover:bg-afterpay-mint/20 transition-all duration-200"
            >
              Checkout Demo
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 hover:text-afterpay-black hover:bg-afterpay-mint/20 transition-all duration-200"
            >
              Admin
            </Link>
          </nav>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center space-x-2 px-4 py-2 rounded-lg text-afterpay-gray-600 hover:text-afterpay-black hover:bg-afterpay-mint/20 transition-all duration-200"
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
            <span className="hidden sm:inline text-sm font-medium">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 left-6 sm:left-auto sm:-right-1 bg-afterpay-mint text-afterpay-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm animate-bounce-sm">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
