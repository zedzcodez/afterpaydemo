"use client";

import { useState } from "react";
import { FlowLogs, FlowLogEntry, formatFlowName } from "@/lib/flowLogs";
import { FlowSummarySection } from "./FlowSummarySection";

interface FlowLogsSectionProps {
  flowLogs: FlowLogs;
  expandedLogs: Set<string>;
  toggleLogExpanded: (id: string) => void;
}

export function FlowLogsSection({
  flowLogs,
  expandedLogs,
  toggleLogExpanded,
}: FlowLogsSectionProps) {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const flowName = formatFlowName(flowLogs.flow);

  const getLogIcon = (type: FlowLogEntry["type"]) => {
    const iconConfig = {
      api_request: {
        bg: "bg-gradient-to-br from-blue-500 to-blue-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        ),
      },
      api_response: {
        bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        ),
      },
      callback: {
        bg: "bg-gradient-to-br from-violet-500 to-violet-600",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      redirect: {
        bg: "bg-gradient-to-br from-amber-500 to-orange-500",
        icon: (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        ),
      },
    };

    const config = iconConfig[type];
    return (
      <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shadow-lg shadow-black/20`}>
        {config.icon}
      </div>
    );
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    const isSuccess = status >= 200 && status < 300;
    return (
      <span
        className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
          isSuccess
            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
            : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
        }`}
      >
        {status}
      </span>
    );
  };

  const getTypeLabel = (type: FlowLogEntry["type"]) => {
    const labels = {
      api_request: "REQUEST",
      api_response: "RESPONSE",
      callback: "CALLBACK",
      redirect: "REDIRECT",
    };
    const colors = {
      api_request: "text-blue-400",
      api_response: "text-emerald-400",
      callback: "text-violet-400",
      redirect: "text-amber-400",
    };
    return (
      <span className={`text-[10px] font-bold tracking-wider ${colors[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 ring-1 ring-white/10">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-afterpay-mint to-emerald-400 flex items-center justify-center shadow-lg shadow-afterpay-mint/20">
              <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Integration Flow</h2>
              <p className="text-xs text-slate-400 mt-0.5">{flowName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {flowLogs.entries.length} steps
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Flow Summary */}
      {flowLogs.summary && (
        <div className="p-6 border-b border-white/5">
          <FlowSummarySection summary={flowLogs.summary} />
        </div>
      )}

      {/* Timeline - Collapsible */}
      <div className="p-6">
        {/* Timeline Header */}
        <button
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/80 rounded-lg hover:bg-slate-800 transition-colors mb-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Events Timeline</span>
            <span className="text-xs bg-afterpay-mint text-slate-900 px-2 py-0.5 rounded-full font-medium">
              {flowLogs.entries.length}
            </span>
            {/* Quick status indicators when collapsed */}
            {!isTimelineExpanded && flowLogs.entries.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                {flowLogs.entries.slice(0, 8).map((entry) => {
                  const colorMap = {
                    api_request: "bg-blue-500",
                    api_response: "bg-emerald-500",
                    callback: "bg-violet-500",
                    redirect: "bg-amber-500",
                  };
                  return (
                    <div
                      key={entry.id}
                      className={`w-2 h-2 rounded-full ${colorMap[entry.type]}`}
                      title={entry.label}
                    />
                  );
                })}
                {flowLogs.entries.length > 8 && (
                  <span className="text-xs text-slate-500 ml-1">+{flowLogs.entries.length - 8}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isTimelineExpanded && flowLogs.entries.length > 0 && (
              <span className="text-xs text-slate-400">
                Latest: {flowLogs.entries[flowLogs.entries.length - 1]?.label.substring(0, 30)}
                {(flowLogs.entries[flowLogs.entries.length - 1]?.label.length || 0) > 30 ? "..." : ""}
              </span>
            )}
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                isTimelineExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Timeline Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isTimelineExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}>
        <div className="relative space-y-1">
          {flowLogs.entries.map((entry, index) => (
            <div key={entry.id} className="relative group">
              {/* Connector line */}
              {index < flowLogs.entries.length - 1 && (
                <div className="absolute left-[13px] top-9 bottom-0 w-px bg-gradient-to-b from-slate-700 to-slate-800" />
              )}

              <button
                onClick={() => toggleLogExpanded(entry.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  expandedLogs.has(entry.id)
                    ? "bg-slate-800/80 ring-1 ring-white/10"
                    : "hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    {getLogIcon(entry.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeLabel(entry.type)}
                      {getStatusBadge(entry.status)}
                      {entry.duration && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {entry.duration}ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white mt-1 truncate">
                      {entry.label}
                    </p>
                    {entry.endpoint && (
                      <p className="text-xs text-slate-500 font-mono mt-1 truncate">
                        {entry.method && (
                          <span className="text-slate-400">{entry.method} </span>
                        )}
                        {entry.endpoint}
                      </p>
                    )}
                  </div>

                  {/* Timestamp & expand indicator */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-slate-600 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    <svg
                      className={`w-4 h-4 text-slate-600 mt-1 ml-auto transition-transform duration-200 ${
                        expandedLogs.has(entry.id) ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded data */}
              {expandedLogs.has(entry.id) && entry.data && (
                <div className="ml-10 mt-1 mb-3 rounded-lg bg-slate-950 ring-1 ring-white/5 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Payload
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2));
                      }}
                      className="text-[10px] text-slate-500 hover:text-white transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 scrollbar-thin">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="px-6 py-4 border-t border-white/5 bg-slate-900/30">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Legend:</span>
          {[
            { type: "api_request" as const, label: "Request", color: "from-blue-500 to-blue-600" },
            { type: "api_response" as const, label: "Response", color: "from-emerald-500 to-emerald-600" },
            { type: "callback" as const, label: "Callback", color: "from-violet-500 to-violet-600" },
            { type: "redirect" as const, label: "Redirect", color: "from-amber-500 to-orange-500" },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded bg-gradient-to-br ${item.color}`} />
              <span className="text-[10px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
