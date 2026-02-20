"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { useConfig } from "./ConfigProvider";
import { useTheme } from "./ThemeProvider";
import { BuyNowButton } from "./BuyNowButton";

import { useBuyNowCheckout } from "@/hooks/useBuyNowCheckout";
import { formatPrice } from "@/lib/products";

// --- SVG Icon Components ---

function SunIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

// --- Navigation Items ---

const navItems = [
  { href: "/", label: "Shop" },
  { href: "/admin", label: "Admin" },
  { href: "/orders", label: "Orders" },
  { href: "/docs", label: "User Guide" },
];

// --- Header Component ---

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { items, total, itemCount, removeFromCart, cartAnimationTrigger } = useCart();
  const { config } = useConfig();
  const { resolvedTheme, setTheme } = useTheme();
  const { startBuyNow, isLoading } = useBuyNowCheckout("buynow-afterpay-button-minicart");

  const [isAnimating, setIsAnimating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);

  const miniCartRef = useRef<HTMLDivElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);

  // Trigger bounce animation when cart updates
  useEffect(() => {
    if (cartAnimationTrigger > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartAnimationTrigger]);

  // Close mobile menu and mini-cart on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMiniCartOpen(false);
  }, [pathname]);

  // Close mini-cart on click outside
  useEffect(() => {
    if (!miniCartOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        miniCartRef.current &&
        !miniCartRef.current.contains(event.target as Node) &&
        cartButtonRef.current &&
        !cartButtonRef.current.contains(event.target as Node)
      ) {
        setMiniCartOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [miniCartOpen]);

  // Close mini-cart on Escape key
  useEffect(() => {
    if (!miniCartOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMiniCartOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [miniCartOpen]);

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

  const toggleMiniCart = useCallback(() => {
    setMiniCartOpen((prev) => !prev);
  }, []);

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
            ? "text-white"
            : "text-afterpay-gray-400 hover:text-white"
        }`}
      >
        {label}
        {active && (
          <span className="absolute inset-0 bg-afterpay-mint/15 rounded-full -z-10" />
        )}
      </Link>
    );
  };

  // --- Mini-Cart Item Rendering ---
  const renderMiniCartItems = (compact = false) => (
    <>
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <ShoppingBagIcon className="w-10 h-10 mx-auto text-afterpay-gray-300 dark:text-afterpay-gray-600 mb-3" />
          <p className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400 mb-3">
            Your cart is empty
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-afterpay-black dark:text-white hover:text-afterpay-mint transition-colors"
            onClick={() => {
              setMiniCartOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className={`divide-y divide-afterpay-gray-100 dark:divide-afterpay-gray-700 ${compact ? "" : "max-h-64 overflow-y-auto"}`}>
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 py-3 px-1">
                {/* Product Thumbnail */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-afterpay-gray-100 dark:bg-afterpay-gray-800 shrink-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-afterpay-black dark:text-white truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">
                    Qty: {item.quantity} &middot; {formatPrice(item.product.price)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-1 text-afterpay-gray-400 hover:text-red-500 transition-colors shrink-0"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Cart Total */}
          <div className="border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-3 mt-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-afterpay-gray-600 dark:text-afterpay-gray-300">
                Total
              </span>
              <span className="text-base font-bold text-afterpay-black dark:text-white">
                {formatPrice(total)}
              </span>
            </div>

            {/* SDK target for Buy Now popup (zero-size, must not be display:none) */}
            <div id="buynow-afterpay-button-minicart" className="absolute w-0 h-0 overflow-hidden" />

            {/* Checkout Buttons */}
            <div className="space-y-2">
              <BuyNowButton
                onClick={() => startBuyNow({ items, total })}
                disabled={isLoading}
                size="compact"
              />
              <button
                type="button"
                onClick={() => {
                  setMiniCartOpen(false);
                  setMobileMenuOpen(false);
                  router.push("/checkout");
                }}
                className="w-full h-10 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 text-afterpay-black dark:text-white text-sm font-medium rounded-xl border border-afterpay-gray-300 dark:border-afterpay-gray-600 hover:bg-afterpay-gray-200 dark:hover:bg-afterpay-gray-600 transition-colors cursor-pointer"
              >
                Continue to checkout
              </button>
            </div>

            {/* View Full Cart Link */}
            <Link
              href="/cart"
              className="block mt-3 text-center text-sm font-medium text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white transition-colors"
              onClick={() => {
                setMiniCartOpen(false);
                setMobileMenuOpen(false);
              }}
            >
              View Full Cart
            </Link>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-afterpay-black border-b border-afterpay-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 z-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Cash App Afterpay"
                src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg"
                height="32"
                className="h-7 sm:h-8"
              />
            </Link>

            {/* Desktop Navigation - Centered */}
            <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center space-x-1">
                {navItems.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>
            </nav>

            {/* Right Side - Desktop */}
            <div className="hidden md:flex items-center space-x-1 z-10">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-afterpay-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {resolvedTheme === "dark" ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>

              {/* Cart Icon Button with Badge */}
              <div className="relative">
                <button
                  ref={cartButtonRef}
                  onClick={toggleMiniCart}
                  className="relative p-2 rounded-lg text-afterpay-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                  aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
                  aria-expanded={miniCartOpen}
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span
                      key={cartAnimationTrigger}
                      className={`absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-afterpay-mint text-afterpay-black text-[10px] font-bold rounded-full ${
                        isAnimating ? "animate-bounce-sm" : ""
                      }`}
                    >
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </button>

                {/* Mini-Cart Dropdown */}
                {miniCartOpen && (
                  <div
                    ref={miniCartRef}
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-afterpay-gray-900 rounded-xl border border-afterpay-gray-200 dark:border-afterpay-gray-700 shadow-card-hover z-50"
                  >
                    {/* Dropdown Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <h3 className="text-sm font-display font-semibold text-afterpay-black dark:text-white">
                        Shopping Cart
                      </h3>
                      {itemCount > 0 && (
                        <span className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                      )}
                    </div>

                    {/* Dropdown Body */}
                    <div className="px-4 pb-4">
                      {renderMiniCartItems()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Mobile */}
            <div className="flex items-center space-x-1 md:hidden">
              {/* Mobile Cart Icon */}
              <button
                onClick={() => {
                  setMobileMenuOpen(true);
                }}
                className="relative p-2 rounded-lg text-afterpay-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
              >
                <ShoppingBagIcon className="w-5 h-5" />
                {itemCount > 0 && (
                  <span
                    key={cartAnimationTrigger}
                    className={`absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-afterpay-mint text-afterpay-black text-[10px] font-bold rounded-full ${
                      isAnimating ? "animate-bounce-sm" : ""
                    }`}
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg text-afterpay-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Open menu"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Developer Mode Indicator Bar */}
      {config.developerMode && (
        <Link
          href="/admin"
          className="block w-full bg-terminal-bg py-1.5 text-center animate-dev-enter relative overflow-hidden sticky top-16 z-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(178, 252, 228, 0.05) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <span className="font-code text-xs text-terminal-text tracking-wider">
            &#9670; DEVELOPER MODE
          </span>
        </Link>
      )}

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
          className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-afterpay-gray-900 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700 shrink-0">
            <span className="font-display font-semibold text-afterpay-black dark:text-white">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-800 transition-all duration-200"
              aria-label="Close menu"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {/* Navigation */}
            <div>
              <p className="px-4 text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-2">
                Navigation
              </p>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} mobile />
                ))}
              </div>
            </div>

            {/* Mini-Cart Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-afterpay-gray-400 dark:text-afterpay-gray-500 uppercase tracking-wider mb-2">
                Shopping Cart
              </p>
              <div className="px-1">
                {renderMiniCartItems(true)}
              </div>
            </div>
          </div>

          {/* Menu Footer - Theme Toggle */}
          <div className="shrink-0 px-4 py-4 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
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
