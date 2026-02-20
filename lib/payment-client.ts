/**
 * Client-side helpers for Afterpay payment API calls.
 * Encapsulates the common pattern: fetch → log request → log response → validate → return data.
 * Callers handle flow-specific concerns (updateFlowSummary, redirects, UI state).
 */

import { addFlowLog } from "./flowLogs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PaymentResult<T = any> {
  orderId: string;
  data: T;
}

interface CaptureFullOptions {
  amount?: number;
  isCheckoutAdjusted?: boolean;
  paymentScheduleChecksum?: string;
}

interface AuthOptions {
  amount?: number;
  isCheckoutAdjusted?: boolean;
  paymentScheduleChecksum?: string;
}

/**
 * Capture Full Payment (Immediate Mode) — combines auth + capture in one call.
 * POST /api/afterpay/capture-full → /v2/payments/capture
 */
export async function captureFullPaymentClient(
  orderToken: string,
  options?: CaptureFullOptions
): Promise<PaymentResult> {
  const clientRequest: Record<string, unknown> = { token: orderToken };
  if (options?.amount != null) clientRequest.amount = options.amount;
  if (options?.isCheckoutAdjusted) clientRequest.isCheckoutAdjusted = true;
  if (options?.paymentScheduleChecksum) clientRequest.paymentScheduleChecksum = options.paymentScheduleChecksum;

  const startTime = Date.now();
  const response = await fetch("/api/afterpay/capture-full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientRequest),
  });

  const data = await response.json();
  const duration = Date.now() - startTime;

  addFlowLog({
    type: "api_request",
    label: "Capture Full Payment (Immediate Mode)",
    method: "POST",
    endpoint: "/api/afterpay/capture-full \u2192 /v2/payments/capture",
    data: data._meta?.requestBody || clientRequest,
    fullUrl: data._meta?.fullUrl,
    headers: data._meta?.headers,
  });

  addFlowLog({
    type: "api_response",
    label: "Capture Full Response",
    method: "POST",
    endpoint: "/v2/payments/capture",
    status: response.status,
    data,
    duration,
    fullUrl: data._meta?.fullUrl,
  });

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.status !== "APPROVED") {
    throw new Error("Payment was not approved");
  }

  return { orderId: data.id, data };
}

/**
 * Authorize Payment (Deferred Mode) — auth only, capture later from Admin.
 * POST /api/afterpay/auth → /v2/payments/auth
 */
export async function authorizePaymentClient(
  orderToken: string,
  options?: AuthOptions
): Promise<PaymentResult> {
  const clientRequest: Record<string, unknown> = { token: orderToken };
  if (options?.amount != null) clientRequest.amount = options.amount;
  if (options?.isCheckoutAdjusted) clientRequest.isCheckoutAdjusted = true;
  if (options?.paymentScheduleChecksum) clientRequest.paymentScheduleChecksum = options.paymentScheduleChecksum;

  const startTime = Date.now();
  const response = await fetch("/api/afterpay/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientRequest),
  });

  const data = await response.json();
  const duration = Date.now() - startTime;

  addFlowLog({
    type: "api_request",
    label: "Authorize Payment (Deferred Mode)",
    method: "POST",
    endpoint: "/api/afterpay/auth \u2192 /v2/payments/auth",
    data: data._meta?.requestBody || clientRequest,
    fullUrl: data._meta?.fullUrl,
    headers: data._meta?.headers,
  });

  addFlowLog({
    type: "api_response",
    label: "Authorization Response",
    method: "POST",
    endpoint: "/v2/payments/auth",
    status: response.status,
    data,
    duration,
    fullUrl: data._meta?.fullUrl,
  });

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.status !== "APPROVED") {
    throw new Error("Payment was not approved");
  }

  return { orderId: data.id, data };
}
