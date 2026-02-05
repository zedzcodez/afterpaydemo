"use client";

import { useState } from "react";
import { OSMPlacement } from "./OSMPlacement";

interface OSMInfoSectionProps {
  pageType: "product" | "cart";
  amount: number;
  currency?: string;
  productSku?: string;
  productCategory?: string;
}

// Environment detection
const isProduction = process.env.NEXT_PUBLIC_AFTERPAY_ENVIRONMENT === "production";
const mpid = process.env.NEXT_PUBLIC_AFTERPAY_MPID || "your-mpid";
const pdpPlacementId = process.env.NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID || "your-pdp-placement-id";
const cartPlacementId = process.env.NEXT_PUBLIC_OSM_CART_PLACEMENT_ID || "your-cart-placement-id";

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

function CodeBlock({ code, language = "html" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
      <pre className="bg-afterpay-gray-900 text-afterpay-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} />
      </pre>
    </div>
  );
}

// Simple syntax highlighting
function highlightCode(code: string, language: string): string {
  if (language === "html") {
    return code
      // HTML tags
      .replace(/(&lt;\/?)(\w+)/g, '$1<span class="text-rose-400">$2</span>')
      .replace(/(<\/?)(\w+)/g, '$1<span class="text-rose-400">$2</span>')
      // Attributes
      .replace(/(data-[\w-]+|src|class|id)(=)/g, '<span class="text-amber-300">$1</span>$2')
      // Strings
      .replace(/"([^"]*)"/g, '"<span class="text-emerald-400">$1</span>"')
      // Comments
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-afterpay-gray-500">$1</span>');
  }
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

function EnvironmentBadge() {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isProduction
        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
        : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isProduction ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
      {isProduction ? "Production" : "Sandbox"}
    </div>
  );
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

export function OSMInfoSection({
  pageType,
  amount,
  currency = "USD",
  productSku = "",
  productCategory = ""
}: OSMInfoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPlacementId = pageType === "product" ? pdpPlacementId : cartPlacementId;
  const placementIdLabel = pageType === "product" ? "PDP Placement ID" : "Cart Placement ID";

  const scriptTag = `<script src="https://js.squarecdn.com/square-marketplace.js"></script>`;

  const placementCode = `<square-placement
  data-mpid="${mpid}"
  data-placement-id="${currentPlacementId}"
  data-page-type="${pageType}"
  data-amount="${amount.toFixed(2)}"
  data-currency="${currency}"${productSku ? `
  data-item-skus="${productSku}"` : ""}${productCategory ? `
  data-item-categories="${productCategory}"` : ""}
  data-is-eligible="true"
></square-placement>`;

  return (
    <div className="space-y-4">
      {/* Environment Badge & Quick Links */}
      <div className="flex items-center justify-between">
        <EnvironmentBadge />
        <QuickLink href="https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging">
          OSM Docs
        </QuickLink>
      </div>

      {/* OSM Widget */}
      <div className="p-3 bg-white dark:bg-afterpay-gray-50 rounded-lg">
        <OSMPlacement
          pageType={pageType}
          amount={amount}
          currency={currency}
          itemSkus={productSku}
          itemCategories={productCategory}
        />
      </div>

      {/* Expandable Code Section */}
      <div className="border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-750 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-afterpay-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm font-medium text-afterpay-black dark:text-white">View OSM Integration Code</span>
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

        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
          <div className="p-4 space-y-4 bg-white dark:bg-afterpay-gray-900/50">
            {/* Configuration Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                Current Configuration
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between items-center py-1.5 px-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded">
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">MPID</span>
                  <code className="font-mono text-afterpay-black dark:text-white">{mpid.slice(0, 8)}...{mpid.slice(-4)}</code>
                </div>
                <div className="flex justify-between items-center py-1.5 px-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded">
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">{placementIdLabel}</span>
                  <code className="font-mono text-afterpay-black dark:text-white">{currentPlacementId.slice(0, 8)}...</code>
                </div>
                <div className="flex justify-between items-center py-1.5 px-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded">
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Page Type</span>
                  <code className="font-mono text-afterpay-black dark:text-white">{pageType}</code>
                </div>
              </div>
            </div>

            {/* Script Tag */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                  1. Include Script
                </h4>
                <CopyButton text={scriptTag} label="script tag" />
              </div>
              <CodeBlock code={scriptTag} language="html" />
            </div>

            {/* Placement Element */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                  2. Add Placement Element
                </h4>
                <CopyButton text={placementCode} label="placement code" />
              </div>
              <CodeBlock code={placementCode} language="html" />
            </div>

            {/* PDP vs Cart Info */}
            <div className="p-3 bg-afterpay-mint/10 dark:bg-afterpay-mint/5 border border-afterpay-mint/20 rounded-lg">
              <div className="flex gap-2">
                <svg className="w-4 h-4 text-afterpay-mint flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-afterpay-gray-700 dark:text-afterpay-gray-300">
                  <p className="font-medium mb-1">PDP vs Cart Placement IDs</p>
                  <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                    Use different placement IDs for product pages (PDP) and cart/checkout pages.
                    This enables Afterpay to show contextually relevant messaging and track conversion funnels.
                  </p>
                </div>
              </div>
            </div>

            {/* Documentation Links */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
              <QuickLink href="https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging">
                OSM Documentation
              </QuickLink>
              <QuickLink href="https://developers.cash.app/cash-app-afterpay/docs/api">
                API Reference
              </QuickLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment Schedule Widget Code Section
interface PaymentScheduleCodeSectionProps {
  amount: number;
  currency?: string;
}

export function PaymentScheduleCodeSection({
  amount,
  currency = "USD"
}: PaymentScheduleCodeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const widgetScriptTag = `<script src="https://portal.afterpay.com/afterpay.js"></script>`;

  const widgetCode = `// Initialize Payment Schedule Widget
const widget = new AfterPay.Widgets.PaymentSchedule({
  token: checkoutToken,  // From /v2/checkouts response
  amount: { amount: "${amount.toFixed(2)}", currency: "${currency}" },
  target: "#afterpay-widget",
  locale: "en-US",
  theme: "light",  // "light" or "dark"

  onReady: (event) => {
    console.log("Widget ready:", event.data);
  },

  onChange: (event) => {
    // Required for deferred shipping flow
    const checksum = event.data.paymentScheduleChecksum;
    const isValid = event.data.isValid;
    // Store checksum for /v2/payments/auth request
  },

  onError: (event) => {
    console.error("Widget error:", event.data.error);
  }
});

// Update widget when total changes (e.g., shipping)
widget.update({
  amount: { amount: newTotal.toFixed(2), currency: "${currency}" }
});`;

  return (
    <div className="border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 hover:bg-afterpay-gray-100 dark:hover:bg-afterpay-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-afterpay-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-afterpay-black dark:text-white">View Payment Schedule Widget Code</span>
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

      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
        <div className="p-4 space-y-4 bg-white dark:bg-afterpay-gray-900/50">
          {/* Widget Purpose */}
          <div className="p-3 bg-afterpay-mint/10 dark:bg-afterpay-mint/5 border border-afterpay-mint/20 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-afterpay-mint flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-afterpay-gray-700 dark:text-afterpay-gray-300">
                <p className="font-medium mb-1">Payment Schedule Widget (Connected)</p>
                <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                  Shows the 4-payment installment schedule with exact dates. Required for deferred
                  shipping flow to display updated amounts and obtain the paymentScheduleChecksum
                  for authorization.
                </p>
              </div>
            </div>
          </div>

          {/* Script Tag */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                1. Include Afterpay.js
              </h4>
              <CopyButton text={widgetScriptTag} label="script tag" />
            </div>
            <CodeBlock code={widgetScriptTag} language="html" />
          </div>

          {/* Widget Target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                2. Add Widget Container
              </h4>
              <CopyButton text={`<div id="afterpay-widget"></div>`} label="container" />
            </div>
            <CodeBlock code={`<div id="afterpay-widget"></div>`} language="html" />
          </div>

          {/* Widget Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-afterpay-gray-500 dark:text-afterpay-gray-400">
                3. Initialize Widget
              </h4>
              <CopyButton text={widgetCode} label="widget code" />
            </div>
            <CodeBlock code={widgetCode} language="javascript" />
          </div>

          {/* Checksum Note */}
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs text-afterpay-gray-700 dark:text-afterpay-gray-300">
                <p className="font-medium mb-1">Checksum Required for Deferred Shipping</p>
                <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                  When using deferred shipping and adjusting the order amount, you must include
                  the <code className="px-1 py-0.5 bg-afterpay-gray-200 dark:bg-afterpay-gray-700 rounded text-xs">paymentScheduleChecksum</code> in your
                  authorization request to validate the new amount with Afterpay.
                </p>
              </div>
            </div>
          </div>

          {/* Documentation Links */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
            <QuickLink href="https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping">
              Deferred Shipping Guide
            </QuickLink>
            <QuickLink href="https://developers.cash.app/cash-app-afterpay/docs/api/afterpay-js#paymentschedule">
              Widget API Reference
            </QuickLink>
          </div>
        </div>
      </div>
    </div>
  );
}
