"use client";

import { useState } from "react";
import { FlowSummary } from "@/lib/flowLogs";
import { COPY_FEEDBACK_MS } from "@/lib/constants";

// Documentation links for Afterpay parameters
const DOCS_LINKS: Record<string, string> = {
  mode: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  "merchant.popupOriginUrl": "https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method",
  "merchant.redirectConfirmUrl": "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  "merchant.redirectCancelUrl": "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  shippingOptionRequired: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  isCheckoutAdjusted: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping",
  paymentScheduleChecksum: "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping",
  token: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  redirectCheckoutUrl: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1",
  "data.orderToken": "https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout",
  id: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  status: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  originalAmount: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
  openToCaptureAmount: "https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth",
};

interface FlowSummarySectionProps {
  summary: FlowSummary;
}

export function FlowSummarySection({ summary }: FlowSummarySectionProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (section: string, data: object) => {
    const output = {
      _disclaimer: "This is a summary of core integration flow data, not an actual Afterpay API response. For raw API requests and responses, expand the timeline entries below.",
      flow: summary.flow,
      description: summary.description,
      steps: summary.steps,
      ...(section === "all" ? {
        requestConfig: summary.requestConfig,
        ...(summary.adjustment ? { adjustment: summary.adjustment } : {}),
        responseData: summary.responseData,
      } : section === "requestConfig" ? {
        requestConfig: summary.requestConfig,
      } : section === "responseData" ? {
        responseData: summary.responseData,
      } : {}),
    };
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), COPY_FEEDBACK_MS);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string" && value.length > 40) return value.substring(0, 37) + "...";
    return String(value);
  };

  const renderKeyValue = (key: string, value: unknown) => {
    const docsLink = DOCS_LINKS[key];
    return (
      <div key={key} className="flex items-start justify-between gap-4 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 text-xs font-mono truncate">{key}</span>
          {docsLink && (
            <a
              href={docsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-afterpay-mint transition-colors flex-shrink-0"
              title="View Afterpay documentation"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
        <span className="text-emerald-400 text-xs font-mono truncate max-w-[60%] text-right" title={String(value)}>
          {formatValue(value)}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Summary Section */}
      <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Summary</span>
          <button
            onClick={() => copyToClipboard("all", {})}
            className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
          >
            {copiedSection === "all" ? (
              <>
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              "Copy All"
            )}
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-300 mb-3">{summary.description}</p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Steps:</span>
            {summary.steps.map((step, index) => (
              <span key={index} className="flex items-center text-xs text-slate-400">
                {index > 0 && <span className="mx-1 text-slate-600">&rarr;</span>}
                <span className="bg-slate-700/50 px-2 py-0.5 rounded">{step}</span>
              </span>
            ))}
          </div>
          <a
            href={summary.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-afterpay-mint hover:text-afterpay-mint-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Afterpay Documentation
          </a>
        </div>
      </div>

      {/* Request Configuration */}
      {Object.keys(summary.requestConfig).length > 0 && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Request Configuration</span>
            <button
              onClick={() => copyToClipboard("requestConfig", summary.requestConfig)}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              {copiedSection === "requestConfig" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-4">
            {Object.entries(summary.requestConfig).map(([key, value]) => renderKeyValue(key, value))}
          </div>
        </div>
      )}

      {/* Checkout Adjustment (for deferred shipping) */}
      {summary.adjustment && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-afterpay-mint/20 overflow-hidden">
          <div className="px-4 py-3 bg-afterpay-mint/10 border-b border-afterpay-mint/20">
            <span className="text-[10px] font-semibold text-afterpay-mint uppercase tracking-wider">Checkout Adjustment (Deferred Shipping)</span>
          </div>
          <div className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Original Amount</span>
                <span className="font-mono">${summary.adjustment.originalAmount.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping ({summary.adjustment.shippingName})</span>
                <span className="font-mono text-emerald-400">+ ${summary.adjustment.shippingAmount.amount}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-white font-medium">
                <span>Adjusted Amount</span>
                <span className="font-mono">${summary.adjustment.adjustedAmount.amount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>checksum validated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Data */}
      {Object.keys(summary.responseData).length > 0 && (
        <div className="rounded-lg bg-slate-800/50 ring-1 ring-white/5 overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Response Data</span>
            <button
              onClick={() => copyToClipboard("responseData", summary.responseData)}
              className="text-[10px] text-slate-500 hover:text-white transition-colors"
            >
              {copiedSection === "responseData" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="p-4">
            {Object.entries(summary.responseData).map(([key, value]) => renderKeyValue(key, value))}
          </div>
        </div>
      )}
    </div>
  );
}
