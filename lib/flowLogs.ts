// Utility for storing and retrieving checkout flow logs across page navigation

export interface RequestHeaders {
  contentType: string;
  authorization: string;  // Masked as "Basic ***"
  userAgent?: string;
}

export interface ResponseHeaders {
  contentType?: string;
  requestId?: string;  // Afterpay request tracking ID
}

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
  // Enhanced request details
  fullUrl?: string;  // Complete URL (e.g., https://global-api-sandbox.afterpay.com/v2/checkouts)
  pathParams?: Record<string, string>;  // Path parameters (e.g., { orderId: "123" })
  headers?: RequestHeaders;
  responseHeaders?: ResponseHeaders;
  requestSize?: number;  // Request body size in bytes
  responseSize?: number;  // Response body size in bytes
}

export interface FlowSummary {
  flow: string;
  description: string;
  steps: string[];
  docsUrl: string;
  requestConfig: Record<string, unknown>;
  responseData: Record<string, unknown>;
  adjustment?: {
    originalAmount: { amount: string; currency: string };
    shippingAmount: { amount: string; currency: string };
    shippingName: string;
    adjustedAmount: { amount: string; currency: string };
    checksum: string;
  };
}

export interface FlowLogs {
  flow: string;
  startTime: string;
  entries: FlowLogEntry[];
  summary?: FlowSummary;
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

// Check if two entries are duplicates based on key fields
function isDuplicateEntry(
  existing: FlowLogEntry,
  newEntry: Omit<FlowLogEntry, "id" | "timestamp">,
  timeWindowMs: number = 2000
): boolean {
  // Check if the existing entry is within the time window
  const existingTime = new Date(existing.timestamp).getTime();
  const now = Date.now();
  if (now - existingTime > timeWindowMs) {
    return false;
  }

  // Compare key fields
  if (existing.type !== newEntry.type) return false;
  if (existing.label !== newEntry.label) return false;
  if (existing.method !== newEntry.method) return false;
  if (existing.endpoint !== newEntry.endpoint) return false;

  // For callbacks and redirects, also compare data if present
  if (newEntry.type === "callback" || newEntry.type === "redirect") {
    const existingData = JSON.stringify(existing.data || {});
    const newData = JSON.stringify(newEntry.data || {});
    if (existingData !== newData) return false;
  }

  return true;
}

export function addFlowLog(entry: Omit<FlowLogEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const logs: FlowLogs = JSON.parse(stored);

  // Check for duplicates in recent entries (last 10 entries within 2 second window)
  const recentEntries = logs.entries.slice(-10);
  const isDuplicate = recentEntries.some((existing) =>
    isDuplicateEntry(existing, entry)
  );

  if (isDuplicate) {
    // Skip adding duplicate entry
    return;
  }

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

export function setFlowSummary(summary: FlowSummary): void {
  if (typeof window === "undefined") return;

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const logs: FlowLogs = JSON.parse(stored);
  logs.summary = summary;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function updateFlowSummary(updates: Partial<FlowSummary>): void {
  if (typeof window === "undefined") return;

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const logs: FlowLogs = JSON.parse(stored);
  if (logs.summary) {
    logs.summary = { ...logs.summary, ...updates };
  } else {
    logs.summary = updates as FlowSummary;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
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
