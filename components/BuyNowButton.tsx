"use client";

import React from "react";
import { useConfig } from "@/components/ConfigProvider";
import { useTheme } from "@/components/ThemeProvider";

interface BuyNowButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "compact";
}

const LOGO_URLS = {
  light:
    "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-black-32.svg",
  dark: "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg",
} as const;

export function BuyNowButton({
  onClick,
  disabled = false,
  className = "",
  size = "default",
}: BuyNowButtonProps) {
  const { config } = useConfig();
  const { resolvedTheme } = useTheme();

  if (!config.expressCheckout.enabled) {
    return null;
  }

  const isDark = resolvedTheme === "dark";
  const logoUrl = isDark ? LOGO_URLS.dark : LOGO_URLS.light;
  const isCompact = size === "compact";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full flex items-center justify-center gap-2 rounded-[12px] font-display font-bold",
        "transition-all duration-150 ease-in-out",
        isCompact ? "h-10 text-xs px-3" : "h-12 text-base px-6",
        isDark
          ? "bg-black text-white"
          : "bg-[#B2FCE4] text-black",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Buy now with Afterpay"
    >
      <span className="whitespace-nowrap">{isCompact ? "BUY NOW" : "BUY NOW WITH"}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="Afterpay"
        className={isCompact ? "h-5" : "h-6"}
        draggable={false}
      />
    </button>
  );
}
