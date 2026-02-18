"use client";

import React from "react";
import { useTheme } from "@/components/ThemeProvider";

interface AfterpayButtonProps {
  variant: "continue" | "pay";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const SVG_URLS = {
  continue: {
    light:
      "https://static.afterpaycdn.com/en-US/integration/button/continue-with-afterpay/color-on-black.svg",
    dark: "https://static.afterpay.com/en-US/integration/button/continue-with-afterpay/black-on-green.svg",
  },
  pay: {
    light:
      "https://static.afterpaycdn.com/en-US/integration/button/pay-with-afterpay/color-on-black.svg",
    dark: "https://static.afterpay.com/en-US/integration/button/pay-with-afterpay/black-on-green.svg",
  },
} as const;

const ARIA_LABELS = {
  continue: "Continue with Afterpay",
  pay: "Pay with Afterpay",
} as const;

export function AfterpayButton({
  variant,
  onClick,
  disabled = false,
  className = "",
}: AfterpayButtonProps) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const svgUrl = isDark ? SVG_URLS[variant].dark : SVG_URLS[variant].light;
  const ariaLabel = ARIA_LABELS[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "w-full h-12 bg-transparent border-none p-0 transition-opacity duration-150 ease-in-out",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:opacity-90 cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgUrl}
        alt={ariaLabel}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </button>
  );
}
