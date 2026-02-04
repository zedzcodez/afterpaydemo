// Utility for storing and retrieving checkout flow logs across page navigation

export interface FlowLogEntry {
  id: string;
  timestamp: string;
  type: "api_request" | "api_response" | "callback" | "redirect";
  label: string;
  method?: string;
  endpoint?: string;
  status?: number;
  data?: object;
  duration?: number;
}

export interface FlowLogs {
  flow: string;
  startTime: string;
  entries: FlowLogEntry[];
}

const STORAGE_KEY = "afterpay-flow-logs";

// Counter to ensure unique IDs even when entries are added in the same millisecond
let idCounter = 0;

function generateUniqueId(): string {
  idCounter++;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 8)}`;
}

export function initFlowLogs(flow: string): void {
  // Reset counter when starting a new flow
  idCounter = 0;
  const logs: FlowLogs = {
    flow,
    startTime: new Date().toISOString(),
    entries: [],
  };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
}

export function addFlowLog(entry: Omit<FlowLogEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const logs: FlowLogs = JSON.parse(stored);
  logs.entries.push({
    ...entry,
    id: generateUniqueId(),
    timestamp: new Date().toISOString(),
  });
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function getFlowLogs(): FlowLogs | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  return JSON.parse(stored);
}

export function clearFlowLogs(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

// Helper to log an API call (request + response)
export function logApiCall(
  method: string,
  endpoint: string,
  request: object,
  response: object,
  status: number,
  duration: number
): void {
  addFlowLog({
    type: "api_request",
    label: `${method} ${endpoint}`,
    method,
    endpoint,
    data: request,
  });
  addFlowLog({
    type: "api_response",
    label: `Response ${status}`,
    method,
    endpoint,
    status,
    data: response,
    duration,
  });
}

// Helper to log Afterpay.js callbacks
export function logCallback(name: string, data?: object): void {
  addFlowLog({
    type: "callback",
    label: `Afterpay.js: ${name}`,
    data,
  });
}

// Helper to log redirects
export function logRedirect(destination: string, reason: string): void {
  addFlowLog({
    type: "redirect",
    label: reason,
    endpoint: destination,
  });
}
