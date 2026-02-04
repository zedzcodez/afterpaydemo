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

  if (!mpid || !placementId) {
    // Fallback display when env vars are missing
    return (
      <div className="text-sm text-afterpay-gray-500">
        or 4 interest-free payments of{" "}
        <span className="font-medium">${(amount / 4).toFixed(2)}</span> with{" "}
        <span className="font-semibold text-afterpay-black">Afterpay</span>
      </div>
    );
  }

  return <div ref={containerRef} className="afterpay-osm" />;
}
