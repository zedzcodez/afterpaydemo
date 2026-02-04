"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useTheme } from "./ThemeProvider";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

export function Header() {
  const { itemCount, cartAnimationTrigger } = useCart();
  const { resolvedTheme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger bounce animation when cart updates
  useEffect(() => {
    if (cartAnimationTrigger > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartAnimationTrigger]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 glass dark:bg-afterpay-gray-900/80 border-b border-afterpay-gray-200/50 dark:border-afterpay-gray-700/50 shadow-soft">
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
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-mint/20 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
            >
              Shop
            </Link>
            <Link
              href="/checkout"
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-mint/20 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
            >
              Checkout Demo
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-mint/20 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
            >
              Admin
            </Link>
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-mint/20 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center space-x-2 px-4 py-2 rounded-lg text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-mint/20 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
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
              <span
                key={cartAnimationTrigger}
                className={`absolute -top-1 left-6 sm:left-auto sm:-right-1 bg-afterpay-mint text-afterpay-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm ${
                  isAnimating ? "animate-bounce-sm" : ""
                }`}
              >
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
