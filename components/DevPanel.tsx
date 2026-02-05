"use client";

import { useState, useEffect, useRef } from "react";

export interface ApiLog {
  id: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  request?: object;
  response?: object;
  status?: number;
  error?: string;
}

interface DevPanelProps {
  logs: ApiLog[];
  onClear: () => void;
}

const DEFAULT_PANEL_HEIGHT = 256;
const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT_RATIO = 0.8; // 80% of viewport height

// Extract API status from response data
const getApiStatus = (data: object | undefined): string | null => {
  if (!data) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.status === "string") return d.status;
  if (typeof d.paymentState === "string") return d.paymentState;
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
const getErrorMessage = (data: object | undefined): string | null => {
  if (!data) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string") return d.error;
  if (typeof d.message === "string") return d.message;
  if (typeof d.errorCode === "string") return d.errorCode;
  return null;
};

// Map endpoint to documentation URL
const getDocUrl = (endpoint: string): string | null => {
  const docsBase = "https://developers.cash.app/cash-app-afterpay";
  if (endpoint.includes("/checkout")) return `${docsBase}/reference/create-checkout`;
  if (endpoint.includes("/auth")) return `${docsBase}/reference/authorise-payment`;
  if (endpoint.includes("/capture")) return `${docsBase}/reference/capture-payment`;
  if (endpoint.includes("/refund")) return `${docsBase}/reference/create-refund`;
  if (endpoint.includes("/void")) return `${docsBase}/reference/void-payment`;
  if (endpoint.includes("/payment")) return `${docsBase}/reference/get-payment`;
  return `${docsBase}/reference`;
};

export function DevPanel({ logs, onClear }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

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

  return (
    <div ref={panelRef} className="fixed bottom-0 left-0 right-0 bg-afterpay-gray-900 text-white z-50">
      {/* Resize Handle */}
      {isOpen && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-0 left-0 right-0 h-2 cursor-ns-resize group flex items-center justify-center ${
            isResizing ? "bg-afterpay-mint/30" : "hover:bg-afterpay-mint/20"
          }`}
        >
          {/* Visual grip indicator */}
          <div className={`w-12 h-1 rounded-full transition-colors ${
            isResizing ? "bg-afterpay-mint" : "bg-afterpay-gray-600 group-hover:bg-afterpay-mint"
          }`} />
        </div>
      )}
      {/* Header */}
      <div className="w-full px-4 py-2 bg-afterpay-gray-800 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <span className="text-sm font-medium">Developer Panel</span>
          <span className="text-xs bg-afterpay-mint text-afterpay-black px-2 py-0.5 rounded-full">
            {logs.length} requests
          </span>
        </button>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={onClear}
              className="text-xs text-afterpay-gray-400 hover:text-white"
            >
              Clear
            </button>
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{ height: `${panelHeight}px` }} className="flex">
          {/* Log List */}
          <div className="w-1/3 border-r border-afterpay-gray-700 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-afterpay-gray-500 text-sm">
                No API requests yet
              </div>
            ) : (
              logs.map((log) => {
                const apiStatus = getApiStatus(log.response);
                const errorMsg = getErrorMessage(log.response) || log.error;
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
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          log.method === "POST"
                            ? "bg-green-600"
                            : log.method === "GET"
                            ? "bg-blue-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {log.method}
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          log.status && log.status >= 400
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        {log.status || "..."}
                      </span>
                      {apiStatus && (
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getApiStatusColor(apiStatus)}`}
                        >
                          {apiStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-afterpay-gray-300 truncate flex-1">
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
                    {errorMsg && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        {errorMsg}
                      </div>
                    )}
                    <div className="text-xs text-afterpay-gray-500">
                      {log.timestamp.toLocaleTimeString()}
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
                const apiStatus = getApiStatus(log.response);
                const errorMsg = getErrorMessage(log.response) || log.error;
                const docUrl = getDocUrl(log.endpoint);

                return (
                  <div className="space-y-4">
                    {/* Header with doc link */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-afterpay-gray-400">{log.endpoint}</span>
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

                    {log.request && (
                      <div>
                        <h4 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                          REQUEST
                        </h4>
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(log.request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.response && (
                      <div>
                        <h4 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                          RESPONSE
                        </h4>
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-afterpay-gray-500 text-sm">
                Select a request to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing API logs
export function useDevPanel() {
  const [logs, setLogs] = useState<ApiLog[]>([]);

  const addLog = (
    method: string,
    endpoint: string,
    request?: object
  ): string => {
    const id = Date.now().toString();
    setLogs((prev) => [
      {
        id,
        timestamp: new Date(),
        method,
        endpoint,
        request,
      },
      ...prev,
    ]);
    return id;
  };

  const updateLog = (
    id: string,
    update: Partial<Pick<ApiLog, "response" | "status" | "error">>
  ) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...update } : log))
    );
  };

  const clearLogs = () => setLogs([]);

  return { logs, addLog, updateLog, clearLogs };
}
