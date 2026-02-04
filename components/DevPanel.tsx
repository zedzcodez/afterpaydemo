"use client";

import { useState } from "react";

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

export function DevPanel({ logs, onClear }: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-afterpay-gray-900 text-white z-50">
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
        <div className="h-64 flex">
          {/* Log List */}
          <div className="w-1/3 border-r border-afterpay-gray-700 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-afterpay-gray-500 text-sm">
                No API requests yet
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
                      className={`text-xs ${
                        log.status && log.status >= 400
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {log.status || "..."}
                    </span>
                  </div>
                  <div className="text-sm text-afterpay-gray-300 truncate">
                    {log.endpoint}
                  </div>
                  <div className="text-xs text-afterpay-gray-500">
                    {log.timestamp.toLocaleTimeString()}
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
                    {log.request && (
                      <div>
                        <h4 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                          REQUEST
                        </h4>
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto">
                          {JSON.stringify(log.request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.response && (
                      <div>
                        <h4 className="text-xs font-medium text-afterpay-gray-400 mb-2">
                          RESPONSE
                        </h4>
                        <pre className="text-xs bg-afterpay-gray-800 p-3 rounded overflow-x-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div>
                        <h4 className="text-xs font-medium text-red-400 mb-2">
                          ERROR
                        </h4>
                        <pre className="text-xs bg-red-900/50 p-3 rounded">
                          {log.error}
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
