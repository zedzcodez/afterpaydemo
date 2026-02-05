"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getFlowLogs, FlowLogs, FlowLogEntry } from "@/lib/flowLogs";

interface FlowLogsDevPanelProps {
  className?: string;
}

type FilterType = "all" | "api_request" | "api_response" | "callback" | "redirect";

const DEFAULT_PANEL_HEIGHT = 320;
const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT_RATIO = 0.8; // 80% of viewport height

// Custom events for controlling the dev panel externally
export const openDevPanel = (heightPercent: number = 25) => {
  const height = Math.round(window.innerHeight * (heightPercent / 100));
  window.dispatchEvent(new CustomEvent("openDevPanel", { detail: { height } }));
};

export const closeDevPanel = () => {
  window.dispatchEvent(new CustomEvent("closeDevPanel"));
};

export const toggleDevPanel = (heightPercent: number = 25) => {
  window.dispatchEvent(new CustomEvent("toggleDevPanel", { detail: { heightPercent } }));
};

// Hook to track dev panel state from other components
export const useDevPanelState = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleStateChange = (e: CustomEvent<{ isOpen: boolean }>) => {
      setIsOpen(e.detail.isOpen);
    };

    window.addEventListener("devPanelStateChange", handleStateChange as EventListener);
    return () => window.removeEventListener("devPanelStateChange", handleStateChange as EventListener);
  }, []);

  return isOpen;
};

export function FlowLogsDevPanel({ className = "" }: FlowLogsDevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResizeHint, setShowResizeHint] = useState(false);
  const [flowLogs, setFlowLogs] = useState<FlowLogs | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isEventsListExpanded, setIsEventsListExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Resize state
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load persisted height from localStorage
  useEffect(() => {
    const savedHeight = localStorage.getItem("devPanelHeight");
    if (savedHeight) {
      const height = parseInt(savedHeight, 10);
      if (!isNaN(height) && height >= MIN_PANEL_HEIGHT) {
        setPanelHeight(height);
      }
    }
  }, []);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      const maxHeight = window.innerHeight * MAX_PANEL_HEIGHT_RATIO;
      const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(newHeight, maxHeight));
      setPanelHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Persist height to localStorage
        localStorage.setItem("devPanelHeight", panelHeight.toString());
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, panelHeight]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Listen for external open/close/toggle events
  useEffect(() => {
    const handleOpenDevPanel = (e: CustomEvent<{ height: number }>) => {
      const height = Math.max(MIN_PANEL_HEIGHT, Math.min(e.detail.height, window.innerHeight * MAX_PANEL_HEIGHT_RATIO));
      setPanelHeight(height);
      setIsOpen(true);
      setShowResizeHint(true);
      // Hide hint after 5 seconds
      setTimeout(() => setShowResizeHint(false), 5000);
    };

    const handleCloseDevPanel = () => {
      setIsOpen(false);
    };

    const handleToggleDevPanel = (e: CustomEvent<{ heightPercent: number }>) => {
      if (isOpen) {
        setIsOpen(false);
      } else {
        const height = Math.round(window.innerHeight * (e.detail.heightPercent / 100));
        const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(height, window.innerHeight * MAX_PANEL_HEIGHT_RATIO));
        setPanelHeight(clampedHeight);
        setIsOpen(true);
        setShowResizeHint(true);
        setTimeout(() => setShowResizeHint(false), 5000);
      }
    };

    window.addEventListener("openDevPanel", handleOpenDevPanel as EventListener);
    window.addEventListener("closeDevPanel", handleCloseDevPanel);
    window.addEventListener("toggleDevPanel", handleToggleDevPanel as EventListener);

    return () => {
      window.removeEventListener("openDevPanel", handleOpenDevPanel as EventListener);
      window.removeEventListener("closeDevPanel", handleCloseDevPanel);
      window.removeEventListener("toggleDevPanel", handleToggleDevPanel as EventListener);
    };
  }, [isOpen]);

  // Notify other components when panel state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("devPanelStateChange", { detail: { isOpen } }));
  }, [isOpen]);

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
    const docsBase = "https://developers.cash.app/cash-app-afterpay/api-reference/reference";
    if (endpoint.includes("/checkout")) return `${docsBase}/checkouts/create-checkout-1`;
    if (endpoint.includes("/auth")) return `${docsBase}/payments/auth`;
    if (endpoint.includes("/capture")) return `${docsBase}/payments/capture-payment`;
    if (endpoint.includes("/refund")) return `${docsBase}/payments/create-refund`;
    if (endpoint.includes("/void")) return `${docsBase}/payments/void-payment`;
    if (endpoint.includes("/payment")) return `${docsBase}/payments/get-payment-by-order-id`;
    return "https://developers.cash.app/cash-app-afterpay/api-reference";
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const toggleEventExpanded = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getEventIcon = (type: FlowLogEntry["type"]) => {
    switch (type) {
      case "api_request":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case "api_response":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case "callback":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case "redirect":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getEventIconBg = (type: FlowLogEntry["type"]) => {
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

  const getEventTypeLabel = (type: FlowLogEntry["type"]) => {
    switch (type) {
      case "api_request":
        return { label: "REQUEST", color: "text-blue-400" };
      case "api_response":
        return { label: "RESPONSE", color: "text-green-400" };
      case "callback":
        return { label: "CALLBACK", color: "text-purple-400" };
      case "redirect":
        return { label: "REDIRECT", color: "text-orange-400" };
    }
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
    <div ref={panelRef} className={`fixed bottom-0 left-0 right-0 bg-afterpay-gray-900 text-white z-50 ${className}`}>
      {/* Resize Handle - positioned above header with higher z-index */}
      {isOpen && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-0 left-0 right-0 h-3 cursor-ns-resize group flex items-center justify-center z-20 ${
            isResizing ? "bg-afterpay-mint/30" : "hover:bg-afterpay-mint/20"
          }`}
        >
          {/* Visual grip indicator */}
          <div className={`w-16 h-1 rounded-full transition-colors ${
            isResizing ? "bg-afterpay-mint" : "bg-afterpay-gray-600 group-hover:bg-afterpay-mint"
          }`} />
        </div>
      )}
      {/* Header */}
      <div
        className="w-full px-4 py-2 bg-afterpay-gray-800 flex items-center justify-center relative group/header"
        onMouseEnter={() => isOpen && setShowResizeHint(true)}
        onMouseLeave={() => setShowResizeHint(false)}
      >
        {/* Resize tooltip - shown on header hover when panel is open */}
        {isOpen && showResizeHint && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-afterpay-black text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in-up z-10">
            Drag to resize panel
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-afterpay-black" />
          </div>
        )}
        {/* Centered title section */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <span className="text-sm font-bold">Developer Panel</span>
          <span className="text-xs bg-afterpay-mint text-afterpay-black px-2 py-0.5 rounded-full font-semibold">
            {filteredLogs.length}{filter !== "all" || searchQuery ? `/${logs.length}` : ""} events
          </span>
          {flowLogs?.flow && (
            <span className="text-xs text-afterpay-gray-300 font-medium">
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
        {/* Right side controls - absolutely positioned */}
        <div className="absolute right-4 flex items-center gap-2">
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
        <div style={{ height: `${panelHeight}px` }} className="flex flex-col">
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

          {/* Main Content - Card-style Collapsible Events */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Events List Header - Collapsible */}
            <div className="mb-3">
              <button
                onClick={() => setIsEventsListExpanded(!isEventsListExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-afterpay-gray-800 rounded-lg hover:bg-afterpay-gray-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">Events Timeline</span>
                  <span className="text-xs bg-afterpay-mint text-afterpay-black px-2 py-0.5 rounded-full font-medium">
                    {filteredLogs.length}
                  </span>
                  {/* Quick status indicators when collapsed */}
                  {!isEventsListExpanded && filteredLogs.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      {filteredLogs.slice(0, 8).map((log, i) => (
                        <div
                          key={log.id}
                          className={`w-2 h-2 rounded-full ${getEventIconBg(log.type)}`}
                          title={log.label}
                        />
                      ))}
                      {filteredLogs.length > 8 && (
                        <span className="text-xs text-afterpay-gray-500 ml-1">+{filteredLogs.length - 8}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEventsListExpanded && filteredLogs.length > 0 && (
                    <span className="text-xs text-afterpay-gray-400">
                      Latest: {filteredLogs[0]?.label.substring(0, 30)}{filteredLogs[0]?.label.length > 30 ? "..." : ""}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-afterpay-gray-400 transition-transform duration-200 ${
                      isEventsListExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Events List Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isEventsListExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            }`}>
              {filteredLogs.length === 0 ? (
                <div className="text-afterpay-gray-500 text-sm text-center py-8">
                  {logs.length === 0 ? "No events recorded yet. Start a checkout flow to see events." : "No matching events"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                  const apiStatus = getApiStatus(log.data as Record<string, unknown> | undefined);
                  const errorMsg = getErrorMessage(log.data as Record<string, unknown> | undefined);
                  const docUrl = getDocUrl(log.endpoint);
                  const isExpanded = expandedEvents.has(log.id);
                  const typeInfo = getEventTypeLabel(log.type);
                  const dataSize = log.data ? new Blob([JSON.stringify(log.data)]).size : 0;

                  return (
                    <div
                      key={log.id}
                      className="bg-afterpay-gray-800/50 rounded-lg overflow-hidden"
                    >
                      {/* Event Header - Always Visible */}
                      <button
                        onClick={() => toggleEventExpanded(log.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-afterpay-gray-800 transition-colors text-left"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getEventIconBg(log.type)}`}>
                          {getEventIcon(log.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {log.status && (
                              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                log.status >= 400
                                  ? "bg-red-900/50 text-red-400"
                                  : "bg-green-900/50 text-green-400"
                              }`}>
                                {log.status}
                              </span>
                            )}
                            {log.duration && (
                              <span className="text-xs text-afterpay-gray-500">{log.duration}ms</span>
                            )}
                            {apiStatus && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getApiStatusColor(apiStatus)}`}>
                                {apiStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-white truncate">
                            {log.label}
                          </div>
                          {log.endpoint && (
                            <div className="text-xs text-afterpay-gray-400 font-mono truncate mt-0.5">
                              {log.method && <span className="text-afterpay-gray-500">{log.method} </span>}
                              {log.endpoint}
                            </div>
                          )}
                          {errorMsg && !isExpanded && (
                            <div className="text-xs text-red-400 mt-1 truncate">{errorMsg}</div>
                          )}
                        </div>

                        {/* Timestamp & Chevron */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-afterpay-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <svg
                            className={`w-5 h-5 text-afterpay-gray-500 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-afterpay-gray-700/50">
                          <div className="pl-14 space-y-3">
                            {/* Full URL */}
                            {(log.fullUrl || log.endpoint) && (
                              <div>
                                <div className="text-xs font-medium text-afterpay-gray-400 mb-1">URL</div>
                                <div className="text-xs text-white font-mono break-all bg-afterpay-gray-800 rounded p-2">
                                  {log.fullUrl || `https://global-api-sandbox.afterpay.com${log.endpoint}`}
                                </div>
                              </div>
                            )}

                            {/* Error Message */}
                            {errorMsg && (
                              <div className="bg-red-900/30 border border-red-700/50 rounded p-3">
                                <div className="text-xs font-medium text-red-400 mb-1">Error</div>
                                <div className="text-sm text-red-300">{errorMsg}</div>
                              </div>
                            )}

                            {/* Request ID - shown prominently for idempotency debugging */}
                            {((log.data as Record<string, unknown>)?.requestBody as Record<string, unknown>)?.requestId || ((log.data as Record<string, unknown>)?._meta as Record<string, unknown>)?.requestId ? (
                              <div className="bg-afterpay-gray-800 rounded p-3">
                                <span className="text-xs text-afterpay-gray-400">Request ID: </span>
                                <code className="text-xs text-afterpay-mint font-mono">
                                  {(((log.data as Record<string, unknown>)?.requestBody as Record<string, unknown>)?.requestId || ((log.data as Record<string, unknown>)?._meta as Record<string, unknown>)?.requestId) as string}
                                </code>
                              </div>
                            ) : null}

                            {/* Data/Payload */}
                            {log.data && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-afterpay-gray-400">
                                    {log.type === "api_request" ? "Request Body" : log.type === "api_response" ? "Response Body" : "Data"}
                                    <span className="text-afterpay-gray-500 font-normal ml-2">({formatBytes(dataSize)})</span>
                                  </span>
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(JSON.stringify(log.data, null, 2));
                                      }}
                                      className="text-xs text-afterpay-gray-400 hover:text-white flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      {copySuccess ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                                <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto max-h-48 text-afterpay-gray-100">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* cURL Command for API calls */}
                            {(log.type === "api_request" || log.type === "api_response") && log.endpoint && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-afterpay-gray-400">cURL</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(generateCurl(log));
                                    }}
                                    className="text-xs text-afterpay-gray-400 hover:text-white flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                  </button>
                                </div>
                                <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto text-afterpay-gray-100 font-mono">
                                  {generateCurl(log)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
