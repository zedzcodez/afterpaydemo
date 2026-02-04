"use client";

import { useState, useEffect, useCallback } from "react";
import { getFlowLogs, FlowLogs, FlowLogEntry } from "@/lib/flowLogs";

interface FlowLogsDevPanelProps {
  className?: string;
}

type FilterType = "all" | "api_request" | "api_response" | "callback" | "redirect";

export function FlowLogsDevPanel({ className = "" }: FlowLogsDevPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [flowLogs, setFlowLogs] = useState<FlowLogs | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    headers: true,
    request: true,
    response: true,
  });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setFlowLogs(getFlowLogs());
    const interval = setInterval(() => {
      const logs = getFlowLogs();
      setFlowLogs(logs);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const logs = flowLogs?.entries || [];

  // Sort logs in reverse-chronological order (most recent first)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply filters and search
  const filteredLogs = sortedLogs
    .filter((log) => filter === "all" || log.type === filter)
    .filter((log) => {
      if (searchQuery === "") return true;
      const query = searchQuery.toLowerCase();
      return (
        log.label.toLowerCase().includes(query) ||
        log.endpoint?.toLowerCase().includes(query) ||
        JSON.stringify(log.data).toLowerCase().includes(query)
      );
    });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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

  const getApiStatus = (data: Record<string, unknown> | undefined): string | null => {
    if (!data) return null;
    if (typeof data.status === "string") return data.status;
    if (typeof data.paymentState === "string") return data.paymentState;
    return null;
  };

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

  const getErrorMessage = (data: Record<string, unknown> | undefined): string | null => {
    if (!data) return null;
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
    if (typeof data.errorCode === "string") return data.errorCode;
    return null;
  };

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

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Generate cURL command from log entry
  const generateCurl = useCallback((log: FlowLogEntry): string => {
    const url = log.fullUrl || `https://global-api-sandbox.afterpay.com${log.endpoint || ""}`;
    const parts = [`curl -X ${log.method || "GET"}`];
    parts.push(`  '${url}'`);
    parts.push(`  -H 'Content-Type: application/json'`);
    parts.push(`  -H 'Authorization: Basic <YOUR_CREDENTIALS>'`);
    if (log.data && log.type === "api_request") {
      parts.push(`  -d '${JSON.stringify(log.data)}'`);
    }
    return parts.join(" \\\n");
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  // Export logs as JSON
  const exportAsJson = () => {
    if (!flowLogs) return;
    const blob = new Blob([JSON.stringify(flowLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterpay-flow-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export logs as HAR format
  const exportAsHar = () => {
    if (!flowLogs) return;
    const harLog = {
      log: {
        version: "1.2",
        creator: { name: "Afterpay Demo", version: "1.0" },
        entries: logs
          .filter((log) => log.type === "api_request" || log.type === "api_response")
          .map((log) => ({
            startedDateTime: log.timestamp,
            time: log.duration || 0,
            request: {
              method: log.method || "GET",
              url: log.fullUrl || `https://global-api-sandbox.afterpay.com${log.endpoint || ""}`,
              httpVersion: "HTTP/1.1",
              headers: [
                { name: "Content-Type", value: "application/json" },
                { name: "Authorization", value: "Basic ***" },
              ],
              postData: log.type === "api_request" && log.data
                ? { mimeType: "application/json", text: JSON.stringify(log.data) }
                : undefined,
            },
            response: {
              status: log.status || 200,
              statusText: log.status && log.status >= 400 ? "Error" : "OK",
              httpVersion: "HTTP/1.1",
              headers: [{ name: "Content-Type", value: "application/json" }],
              content: log.type === "api_response" && log.data
                ? { mimeType: "application/json", text: JSON.stringify(log.data) }
                : { mimeType: "application/json", text: "" },
            },
          })),
      },
    };
    const blob = new Blob([JSON.stringify(harLog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterpay-flow-logs-${new Date().toISOString().slice(0, 10)}.har`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "api_request", label: "Requests" },
    { value: "api_response", label: "Responses" },
    { value: "callback", label: "Events" },
    { value: "redirect", label: "Redirects" },
  ];

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
            {filteredLogs.length}{filter !== "all" || searchQuery ? `/${logs.length}` : ""} events
          </span>
          {flowLogs?.flow && (
            <span className="text-xs text-afterpay-gray-400">
              {flowLogs.flow === "express-integrated"
                ? "Express (Integrated)"
                : flowLogs.flow === "express-deferred"
                ? "Express (Deferred)"
                : flowLogs.flow === "admin"
                ? "Admin"
                : "Standard Checkout"}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {/* Export Dropdown */}
              <div className="relative group">
                <button className="text-xs text-afterpay-gray-400 hover:text-white px-2 py-1 rounded hover:bg-afterpay-gray-700 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <div className="absolute right-0 top-full mt-1 bg-afterpay-gray-800 border border-afterpay-gray-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={exportAsJson}
                    className="block w-full text-left text-xs px-3 py-2 hover:bg-afterpay-gray-700 whitespace-nowrap"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={exportAsHar}
                    className="block w-full text-left text-xs px-3 py-2 hover:bg-afterpay-gray-700 whitespace-nowrap"
                  >
                    Export as HAR
                  </button>
                </div>
              </div>
            </>
          )}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="h-80 flex flex-col">
          {/* Filter Bar */}
          <div className="px-4 py-2 bg-afterpay-gray-850 border-b border-afterpay-gray-700 flex items-center gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    filter === option.value
                      ? "bg-afterpay-mint text-afterpay-black"
                      : "bg-afterpay-gray-700 text-afterpay-gray-300 hover:bg-afterpay-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* Search Input */}
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-afterpay-gray-800 border border-afterpay-gray-700 rounded focus:outline-none focus:border-afterpay-mint text-white placeholder-afterpay-gray-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-afterpay-gray-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Log List */}
            <div className="w-1/3 border-r border-afterpay-gray-700 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="p-4 text-afterpay-gray-500 text-sm">
                  {logs.length === 0 ? "No events recorded yet" : "No matching events"}
                </div>
              ) : (
                filteredLogs.map((log) => {
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
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${getMethodColor(log.type)}`}>
                          {getTypeLabel(log)}
                        </span>
                        {log.status && (
                          <span className={`text-xs font-mono ${log.status >= 400 ? "text-red-400" : "text-green-400"}`}>
                            {log.status}
                          </span>
                        )}
                        {apiStatus && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getApiStatusColor(apiStatus)}`}>
                            {apiStatus}
                          </span>
                        )}
                        {log.duration && (
                          <span className="text-xs text-afterpay-gray-500">{log.duration}ms</span>
                        )}
                      </div>
                      <div className="text-sm text-white truncate">{log.label}</div>
                      {log.endpoint && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-afterpay-gray-400 truncate flex-1">
                            {log.fullUrl || log.endpoint}
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
                        <div className="text-xs text-red-400 mt-1 truncate">{errorMsg}</div>
                      )}
                      <div className="text-xs text-afterpay-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </button>
                  );
                })
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
                  const fullUrl = log.fullUrl || (log.endpoint ? `https://global-api-sandbox.afterpay.com${log.endpoint}` : null);
                  const dataSize = log.data ? new Blob([JSON.stringify(log.data)]).size : 0;

                  return (
                    <div className="space-y-4">
                      {/* Request Overview */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${getMethodColor(log.type)}`}>
                              {getTypeLabel(log)}
                            </span>
                            <h4 className="text-sm font-medium text-white">{log.label}</h4>
                          </div>
                          {fullUrl && (
                            <div className="text-xs text-afterpay-gray-400 font-mono break-all mb-2">
                              {fullUrl}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-afterpay-gray-500">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            {log.duration && <span>{log.duration}ms</span>}
                            {dataSize > 0 && <span>{formatBytes(dataSize)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                              Docs
                            </a>
                          )}
                          {(log.type === "api_request" || log.type === "api_response") && log.endpoint && (
                            <button
                              onClick={() => copyToClipboard(generateCurl(log))}
                              className="text-xs text-afterpay-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-afterpay-gray-700"
                              title="Copy as cURL"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              {copySuccess ? "Copied!" : "cURL"}
                            </button>
                          )}
                        </div>
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

                      {/* Path Parameters */}
                      {log.pathParams && Object.keys(log.pathParams).length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-afterpay-gray-400 mb-2">PATH PARAMETERS</h5>
                          <div className="bg-afterpay-gray-800 rounded p-3">
                            {Object.entries(log.pathParams).map(([key, value]) => (
                              <div key={key} className="flex text-xs">
                                <span className="text-afterpay-mint font-mono">{key}:</span>
                                <span className="text-white ml-2 font-mono">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Headers Section */}
                      {(log.headers || log.type === "api_request" || log.type === "api_response") && (
                        <div>
                          <button
                            onClick={() => toggleSection("headers")}
                            className="flex items-center gap-2 text-xs font-medium text-afterpay-gray-400 mb-2 hover:text-white"
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${expandedSections.headers ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            HEADERS
                          </button>
                          {expandedSections.headers && (
                            <div className="bg-afterpay-gray-800 rounded p-3 text-xs font-mono space-y-1">
                              <div className="flex">
                                <span className="text-afterpay-mint">Content-Type:</span>
                                <span className="text-white ml-2">{log.headers?.contentType || "application/json"}</span>
                              </div>
                              <div className="flex">
                                <span className="text-afterpay-mint">Authorization:</span>
                                <span className="text-white ml-2">{log.headers?.authorization || "Basic ***"}</span>
                              </div>
                              {log.headers?.userAgent && (
                                <div className="flex">
                                  <span className="text-afterpay-mint">User-Agent:</span>
                                  <span className="text-white ml-2">{log.headers.userAgent}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Request/Response Data */}
                      {log.data && (
                        <div>
                          <button
                            onClick={() => toggleSection(log.type === "api_request" ? "request" : "response")}
                            className="flex items-center gap-2 text-xs font-medium text-afterpay-gray-400 mb-2 hover:text-white"
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${
                                expandedSections[log.type === "api_request" ? "request" : "response"] ? "rotate-90" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {log.type === "api_request" ? "REQUEST BODY" : "RESPONSE BODY"}
                            <span className="text-afterpay-gray-500 font-normal">({formatBytes(dataSize)})</span>
                          </button>
                          {expandedSections[log.type === "api_request" ? "request" : "response"] && (
                            <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto max-h-64">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                      {!log.data && log.type !== "redirect" && log.type !== "callback" && (
                        <p className="text-sm text-afterpay-gray-500">No data available</p>
                      )}
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
        </div>
      )}
    </div>
  );
}
