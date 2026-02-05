"use client";

import { useEffect, useRef, useState } from "react";

interface OSMPlacementProps {
  pageType: "product" | "cart";
  amount: number;
  currency?: string;
  locale?: string;
  itemSkus?: string;
  itemCategories?: string;
  isEligible?: boolean;
}

// Dark mode fallback component with official Afterpay branding
function DarkModeFallback({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-afterpay-gray-300">
        or 4 interest-free payments of{" "}
        <span className="font-semibold text-white">${(amount / 4).toFixed(2)}</span>
        {" "}with
      </span>
      <img
        alt="Afterpay"
        src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg"
        height="20"
        className="h-5 inline-block"
      />
    </div>
  );
}

export function OSMPlacement({
  pageType,
  amount,
  currency = "USD",
  locale = "en-US",
  itemSkus = "",
  itemCategories = "",
  isEligible = true,
}: OSMPlacementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const mpid = process.env.NEXT_PUBLIC_AFTERPAY_MPID;
  const placementId =
    pageType === "product"
      ? process.env.NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID
      : process.env.NEXT_PUBLIC_OSM_CART_PLACEMENT_ID;

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Don't render widget in dark mode - use fallback instead
    if (isDarkMode) return;
    if (!containerRef.current || !mpid || !placementId) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    // Create the square-placement element
    const placement = document.createElement("square-placement");
    placement.setAttribute("data-mpid", mpid);
    placement.setAttribute("data-placement-id", placementId);
    placement.setAttribute("data-page-type", pageType);
    placement.setAttribute("data-amount", amount.toFixed(2));
    placement.setAttribute("data-currency", currency);
    placement.setAttribute("data-consumer-locale", locale);
    placement.setAttribute("data-item-skus", itemSkus);
    placement.setAttribute("data-item-categories", itemCategories);
    placement.setAttribute("data-is-eligible", isEligible.toString());

    containerRef.current.appendChild(placement);
  }, [
    pageType,
    amount,
    currency,
    locale,
    itemSkus,
    itemCategories,
    isEligible,
    mpid,
    placementId,
    isDarkMode,
  ]);

  // Show dark mode fallback
  if (isDarkMode) {
    return <DarkModeFallback amount={amount} />;
  }

  // Fallback display when env vars are missing
  if (!mpid || !placementId) {
    return (
      <div className="flex items-center gap-2 text-sm text-afterpay-gray-500">
        <span>
          or 4 interest-free payments of{" "}
          <span className="font-semibold">${(amount / 4).toFixed(2)}</span>
          {" "}with
        </span>
        <img
          alt="Afterpay"
          src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-black-32.svg"
          height="20"
          className="h-5 inline-block"
        />
      </div>
    );
  }

  return <div ref={containerRef} className="afterpay-osm" />;
}
