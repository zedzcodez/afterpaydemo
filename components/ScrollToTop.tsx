"use client";

import { useState, useEffect } from "react";

const SCROLL_THRESHOLD = 300;

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    // Check initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToTop();
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      onKeyDown={handleKeyDown}
      aria-label="Scroll to top of page"
      title="Back to top"
      className="fixed bottom-6 inset-x-0 mx-auto z-50 w-12 h-12 flex items-center justify-center bg-afterpay-black dark:bg-afterpay-gray-700 text-white rounded-full shadow-lg hover:bg-afterpay-mint hover:text-afterpay-black hover:shadow-mint-glow focus:outline-none focus:ring-2 focus:ring-afterpay-mint focus:ring-offset-2 dark:focus:ring-offset-afterpay-gray-900 transition-all duration-300 animate-fade-in group"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 transition-transform group-hover:animate-bounce-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
      <span className="sr-only">Back to top</span>
    </button>
  );
}
