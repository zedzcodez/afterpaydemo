"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Navigation items configuration
const demoNav = [
  { href: "/", label: "Shop" },
  { href: "/checkout", label: "Checkout" },
];

const toolsNav = [
  { href: "/admin", label: "Admin" },
  { href: "/orders", label: "Orders" },
  { href: "/docs", label: "User Guide" },
];

export function Header() {
  const pathname = usePathname();
  const { itemCount, cartAnimationTrigger } = useCart();
  const { resolvedTheme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trigger bounce animation when cart updates
  useEffect(() => {
    if (cartAnimationTrigger > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartAnimationTrigger]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavLink = ({ href, label, mobile = false }: { href: string; label: string; mobile?: boolean }) => {
    const active = isActive(href);

    if (mobile) {
      return (
        <Link
          href={href}
          className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
            active
              ? "bg-afterpay-mint/20 text-afterpay-black dark:text-white"
              : "text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800"
          }`}
        >
          {label}
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className={`relative px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
          active
            ? "text-afterpay-black dark:text-white"
            : "text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white"
        }`}
      >
        {label}
        {active && (
          <span className="absolute inset-0 bg-afterpay-mint/20 dark:bg-afterpay-mint/10 rounded-full -z-10" />
        )}
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass dark:bg-afterpay-gray-900/90 border-b border-afterpay-gray-200/50 dark:border-afterpay-gray-700/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 z-10">
              <img
                alt="Cash App Afterpay"
                src={resolvedTheme === "dark"
                  ? "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg"
                  : "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-black-32.svg"
                }
                height="32"
                className="h-7 sm:h-8"
              />
            </Link>

            {/* Desktop Navigation - Centered on page */}
            <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
              {/* Demo Section */}
              <div className="flex items-center space-x-1 px-2">
                {demoNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-afterpay-gray-300 dark:bg-afterpay-gray-700 mx-2" />

              {/* Tools Section */}
              <div className="flex items-center space-x-1 px-2">
                {toolsNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-afterpay-gray-300 dark:bg-afterpay-gray-700 mx-2" />

              {/* Theme Toggle - Text Label */}
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 text-sm font-medium whitespace-nowrap text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white transition-all duration-200"
                aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              {/* Cart - Text Label */}
              <Link
                href="/cart"
                className="relative px-3 py-1.5 text-sm font-medium text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white transition-all duration-200"
              >
                Cart
                {itemCount > 0 && (
                  <span
                    key={cartAnimationTrigger}
                    className={`ml-1 bg-afterpay-mint text-afterpay-black text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                      isAnimating ? "animate-bounce-sm" : ""
                    }`}
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Right Side - Mobile Only */}
            <div className="flex items-center space-x-1 md:hidden">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
                aria-label="Open menu"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-72 bg-white dark:bg-afterpay-gray-900 shadow-2xl transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
            <span className="font-display font-semibold text-afterpay-black dark:text-white">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
              aria-label="Close menu"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="px-4 py-6 space-y-6">
            {/* Demo Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-2">
                Demo
              </p>
              <div className="space-y-1">
                {demoNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} mobile />
                ))}
              </div>
            </div>

            {/* Tools Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-2">
                Tools
              </p>
              <div className="space-y-1">
                {toolsNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} mobile />
                ))}
              </div>
            </div>

            {/* Cart in Mobile Menu */}
            <div>
              <p className="px-4 text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-2">
                Shopping
              </p>
              <Link
                href="/cart"
                className="flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
              >
                <span>Cart</span>
                {itemCount > 0 && (
                  <span className="bg-afterpay-mint text-afterpay-black text-xs font-bold rounded-full px-2 py-0.5">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Menu Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">Theme</span>
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-afterpay-gray-100 dark:bg-afterpay-gray-800 text-afterpay-gray-600 dark:text-afterpay-gray-300 text-sm font-medium"
              >
                {resolvedTheme === "dark" ? (
                  <>
                    <SunIcon className="w-4 h-4" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-4 h-4" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
