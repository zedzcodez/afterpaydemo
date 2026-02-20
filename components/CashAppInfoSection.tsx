"use client";

import { useState } from "react";
import { CopyButton, CodeBlock, QuickLink } from "./CodeBlock";

export function CashAppInfoSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  const checkoutApiCode = `// Create checkout with Cash App Pay
const response = await fetch('/v2/checkouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa(merchantId + ':' + secretKey)
  },
  body: JSON.stringify({
    amount: { amount: "50.00", currency: "USD" },
    isCashAppPay: true,
    merchant: {
      redirectConfirmUrl: "https://example.com/confirmation",
      redirectCancelUrl: "https://example.com/checkout"
    }
  })
});`;

  const sdkInitCode = `AfterPay.initializeForCashAppPay({
  countryCode: "US",
  token: checkoutToken,
  cashAppPayOptions: {
    button: {
      size: "medium",
      width: "full",
      theme: "dark",
      shape: "semiround"
    },
    onComplete: (event) => {
      console.log("Status:", event.data.status);
      console.log("Cashtag:", event.data.cashtag);
      console.log("Token:", event.data.orderToken);
    },
    eventListeners: {
      CUSTOMER_REQUEST_DECLINED: () => {
        console.log("Payment declined");
      }
    }
  }
});`;

  const buttonOptionsCode = `// Available button customization options
cashAppPayOptions: {
  button: {             // Set to false for custom button
    size: "medium",     // "small" | "medium"
    width: "full",      // "full" | "static"
    theme: "dark",      // "dark" | "light"
    shape: "semiround"  // "round" | "semiround"
  }
}`;

  return (
    <div className="border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-afterpay-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="text-sm font-medium text-afterpay-black dark:text-white">View Cash App Pay Integration Code</span>
        </div>
        <svg
          className={`w-4 h-4 text-afterpay-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
        <div className="p-4 space-y-4 bg-white dark:bg-afterpay-gray-900/50">
          {/* Overview */}
          <div className="p-3 bg-afterpay-mint/10 dark:bg-afterpay-mint/5 border border-afterpay-mint/20 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-afterpay-mint flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-afterpay-gray-700 dark:text-afterpay-gray-300">
                <p className="font-medium mb-1">Cash App Pay Overview</p>
                <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                  Cash App Pay lets customers pay now using their Cash App account. On desktop, a QR code is displayed. On mobile, the customer is redirected to Cash App.
                </p>
              </div>
            </div>
          </div>

          {/* Checkout API */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                1. Create Checkout
              </h4>
              <CopyButton text={checkoutApiCode} label="checkout API code" />
            </div>
            <CodeBlock code={checkoutApiCode} language="javascript" />
          </div>

          {/* SDK Initialization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                2. Initialize Cash App Pay SDK
              </h4>
              <CopyButton text={sdkInitCode} label="SDK initialization code" />
            </div>
            <CodeBlock code={sdkInitCode} language="javascript" />
          </div>

          {/* Button Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                3. Button Options
              </h4>
              <CopyButton text={buttonOptionsCode} label="button options code" />
            </div>
            <CodeBlock code={buttonOptionsCode} language="javascript" />
          </div>

          {/* Documentation Links */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
            <QuickLink href="https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview">
              Cash App Pay Documentation
            </QuickLink>
          </div>
        </div>
      </div>
    </div>
  );
}
