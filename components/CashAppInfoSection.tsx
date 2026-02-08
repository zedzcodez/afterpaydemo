"use client";

import { useState } from "react";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all duration-200 bg-afterpay-gray-700 hover:bg-afterpay-mint hover:text-afterpay-black text-afterpay-gray-300"
      title={`Copy ${label || "code"}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, language = "javascript" }: { code: string; language?: string }) {
  // All code content is developer-controlled static strings, not user input.
  // This is the same pattern used in OSMInfoSection.tsx for syntax highlighting.
  const highlighted = highlightCode(code, language);

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-afterpay-gray-900 text-afterpay-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

// Simple syntax highlighting for static developer code snippets
function highlightCode(code: string, language: string): string {
  if (language === "javascript" || language === "js") {
    return code
      // Comments (single line)
      .replace(/(\/\/[^\n]*)/g, '<span class="text-afterpay-gray-500">$1</span>')
      // Keywords
      .replace(/\b(const|let|var|new|function|async|await|return|if|else|try|catch)\b/g, '<span class="text-purple-400">$1</span>')
      // Strings
      .replace(/"([^"]*)"/g, '"<span class="text-emerald-400">$1</span>"')
      // Object properties/methods
      .replace(/\.(\w+)\s*\(/g, '.<span class="text-sky-400">$1</span>(')
      .replace(/(\w+):/g, '<span class="text-amber-300">$1</span>:')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');
  }
  return code;
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-mint transition-colors"
    >
      {children}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

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
          <svg className="w-4 h-4 text-afterpay-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <svg className="w-4 h-4 text-afterpay-mint flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
