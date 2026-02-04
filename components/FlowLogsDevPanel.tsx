"use client";

import { useState, useEffect } from "react";
import { getFlowLogs, FlowLogs, FlowLogEntry } from "@/lib/flowLogs";

interface FlowLogsDevPanelProps {
  className?: string;
}

export function FlowLogsDevPanel({ className = "" }: FlowLogsDevPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [flowLogs, setFlowLogs] = useState<FlowLogs | null>(null);

  useEffect(() => {
    // Get initial flow logs
    setFlowLogs(getFlowLogs());

    // Poll for updates (in case logs are added during page lifecycle)
    const interval = setInterval(() => {
      const logs = getFlowLogs();
      setFlowLogs(logs);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const logs = flowLogs?.entries || [];

  const getMethodColor = (type: FlowLogEntry["type"]) => {
    switch (type) {
      case "api_request":
        return "bg-blue-600";
      case "api_response":
        return "bg-green-600";
      case "callback":
        return "bg-purple-600";
      case "redirect":
        return "bg-orange-600";
      default:
        return "bg-gray-600";
    }
  };

  const getTypeLabel = (entry: FlowLogEntry) => {
    if (entry.method) return entry.method;
    switch (entry.type) {
      case "callback":
        return "EVENT";
      case "redirect":
        return "REDIRECT";
      default:
        return entry.type.toUpperCase();
    }
  };

  // Extract API status from response data
  const getApiStatus = (data: Record<string, unknown> | undefined): string | null => {
    if (!data) return null;
    // Check common status fields from Afterpay API
    if (typeof data.status === "string") return data.status;
    if (typeof data.paymentState === "string") return data.paymentState;
    return null;
  };

  // Get color for API status
  const getApiStatusColor = (status: string): string => {
    const upperStatus = status.toUpperCase();
    if (["APPROVED", "CAPTURED", "AUTH_APPROVED"].includes(upperStatus)) {
      return "text-green-400 bg-green-900/30";
    }
    if (["DECLINED", "AUTH_DECLINED", "FAILED", "ERROR"].includes(upperStatus)) {
      return "text-red-400 bg-red-900/30";
    }
    if (["PENDING", "VOIDED", "PARTIALLY_CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(upperStatus)) {
      return "text-yellow-400 bg-yellow-900/30";
    }
    return "text-gray-400 bg-gray-700";
  };

  // Extract error message from response
  const getErrorMessage = (data: Record<string, unknown> | undefined): string | null => {
    if (!data) return null;
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
    if (typeof data.errorCode === "string") return data.errorCode;
    return null;
  };

  // Map endpoint to documentation URL
  const getDocUrl = (endpoint: string | undefined): string | null => {
    if (!endpoint) return null;
    const docsBase = "https://developers.cash.app/cash-app-afterpay";
    if (endpoint.includes("/checkout")) return `${docsBase}/reference/create-checkout`;
    if (endpoint.includes("/auth")) return `${docsBase}/reference/authorise-payment`;
    if (endpoint.includes("/capture")) return `${docsBase}/reference/capture-payment`;
    if (endpoint.includes("/refund")) return `${docsBase}/reference/create-refund`;
    if (endpoint.includes("/void")) return `${docsBase}/reference/void-payment`;
    if (endpoint.includes("/payment")) return `${docsBase}/reference/get-payment`;
    return `${docsBase}/reference`;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-afterpay-gray-900 text-white z-50 ${className}`}>
      {/* Header */}
      <div className="w-full px-4 py-2 bg-afterpay-gray-800 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <span className="text-sm font-medium">Developer Panel</span>
          <span className="text-xs bg-afterpay-mint text-afterpay-black px-2 py-0.5 rounded-full">
            {logs.length} events
          </span>
          {flowLogs?.flow && (
            <span className="text-xs text-afterpay-gray-400">
              {flowLogs.flow === "express-integrated"
                ? "Express (Integrated)"
                : flowLogs.flow === "express-deferred"
                ? "Express (Deferred)"
                : "Standard Checkout"}
            </span>
          )}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform ${isOpen ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="h-64 flex">
          {/* Log List */}
          <div className="w-1/3 border-r border-afterpay-gray-700 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-afterpay-gray-500 text-sm">
                No events recorded yet
              </div>
            ) : (
              logs.map((log) => {
                const apiStatus = getApiStatus(log.data as Record<string, unknown> | undefined);
                const errorMsg = getErrorMessage(log.data as Record<string, unknown> | undefined);
                const docUrl = getDocUrl(log.endpoint);

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log.id)}
                    className={`w-full p-3 text-left border-b border-afterpay-gray-700 hover:bg-afterpay-gray-800 ${
                      selectedLog === log.id ? "bg-afterpay-gray-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${getMethodColor(log.type)}`}
                      >
                        {getTypeLabel(log)}
                      </span>
                      {log.status && (
                        <span
                          className={`text-xs font-mono ${
                            log.status >= 400
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      )}
                      {apiStatus && (
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getApiStatusColor(apiStatus)}`}
                        >
                          {apiStatus}
                        </span>
                      )}
                      {log.duration && (
                        <span className="text-xs text-afterpay-gray-500">
                          {log.duration}ms
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white truncate">
                      {log.label}
                    </div>
                    {log.endpoint && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-afterpay-gray-400 truncate flex-1">
                          {log.endpoint}
                        </span>
                        {docUrl && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-afterpay-mint hover:underline flex-shrink-0"
                            title="View API documentation"
                          >
                            Docs
                          </a>
                        )}
                      </div>
                    )}
                    {errorMsg && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        {errorMsg}
                      </div>
                    )}
                    <div className="text-xs text-afterpay-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </button>
                );
              }))
            )}
          </div>

          {/* Log Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedLog ? (
              (() => {
                const log = logs.find((l) => l.id === selectedLog);
                if (!log) return null;
                const apiStatus = getApiStatus(log.data as Record<string, unknown> | undefined);
                const errorMsg = getErrorMessage(log.data as Record<string, unknown> | undefined);
                const docUrl = getDocUrl(log.endpoint);

                return (
                  <div className="space-y-4">
                    {/* Header with status */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-afterpay-gray-400">
                        {log.type.toUpperCase().replace("_", " ")}
                      </h4>
                      {docUrl && (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-afterpay-mint hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          API Docs
                        </a>
                      )}
                    </div>

                    {/* API Status Badge */}
                    {apiStatus && (
                      <div className={`inline-block text-sm font-semibold px-3 py-1.5 rounded ${getApiStatusColor(apiStatus)}`}>
                        Status: {apiStatus}
                      </div>
                    )}

                    {/* Error Message */}
                    {errorMsg && (
                      <div className="bg-red-900/30 border border-red-700 rounded p-3">
                        <div className="text-xs font-medium text-red-400 mb-1">Error</div>
                        <div className="text-sm text-red-300">{errorMsg}</div>
                      </div>
                    )}

                    {/* Response Data */}
                    <div>
                      <h5 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                        {log.type === "api_request" ? "REQUEST" : "RESPONSE"}
                      </h5>
                      {log.data && (
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto max-h-48">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                      {!log.data && (
                        <p className="text-sm text-afterpay-gray-500">No data available</p>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-afterpay-gray-500 text-sm">
                Select an event to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
