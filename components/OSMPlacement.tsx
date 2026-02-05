"use client";

import { useEffect, useRef } from "react";

interface OSMPlacementProps {
  pageType: "product" | "cart";
  amount: number;
  currency?: string;
  locale?: string;
  itemSkus?: string;
  itemCategories?: string;
  isEligible?: boolean;
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

  const mpid = process.env.NEXT_PUBLIC_AFTERPAY_MPID;
  const placementId =
    pageType === "product"
      ? process.env.NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID
      : process.env.NEXT_PUBLIC_OSM_CART_PLACEMENT_ID;

  useEffect(() => {
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
  ]);

  // Fallback display when env vars are missing
  if (!mpid || !placementId) {
    return (
      <div className="flex items-center gap-2 text-sm text-afterpay-gray-600 dark:text-afterpay-gray-300">
        <span>
          Pay in 4 interest-free payments with
        </span>
        <img
          alt="Cash App Afterpay"
          src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-color-black-32.svg"
          height="20"
          className="h-5 inline-block dark:hidden"
        />
        <img
          alt="Cash App Afterpay"
          src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-color-white-32.svg"
          height="20"
          className="h-5 hidden dark:inline-block"
        />
      </div>
    );
  }

  return <div ref={containerRef} className="afterpay-osm" />;
}
