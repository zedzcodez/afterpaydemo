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
              logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log.id)}
                  className={`w-full p-3 text-left border-b border-afterpay-gray-700 hover:bg-afterpay-gray-800 ${
                    selectedLog === log.id ? "bg-afterpay-gray-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-mono px-1.5 py-0.5 rounded ${getMethodColor(log.type)}`}
                    >
                      {getTypeLabel(log)}
                    </span>
                    {log.status && (
                      <span
                        className={`text-xs ${
                          log.status >= 400
                            ? "text-red-400"
                            : "text-green-400"
                        }`}
                      >
                        {log.status}
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
                    <div className="text-xs text-afterpay-gray-400 truncate">
                      {log.endpoint}
                    </div>
                  )}
                  <div className="text-xs text-afterpay-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Log Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedLog ? (
              (() => {
                const log = logs.find((l) => l.id === selectedLog);
                if (!log) return null;
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                        {log.type.toUpperCase().replace("_", " ")}
                      </h4>
                      {log.data && (
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto">
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
