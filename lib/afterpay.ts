import {
  CheckoutRequest,
  CheckoutResponse,
  AuthResponse,
  CaptureResponse,
  CartItem,
  Money,
  CheckoutItem,
  PaymentEvent,
} from "./types";

export const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";
const MERCHANT_ID = process.env.AFTERPAY_MERCHANT_ID!;
const SECRET_KEY = process.env.AFTERPAY_SECRET_KEY!;

function getAuthHeader(): string {
  const credentials = Buffer.from(`${MERCHANT_ID}:${SECRET_KEY}`).toString(
    "base64"
  );
  return `Basic ${credentials}`;
}

const TRANSIENT_STATUS_CODES = [500, 502, 503, 504];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function afterpayFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[afterpayFetch] Retry ${attempt}/${MAX_RETRIES} for ${endpoint}`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
        ...options.headers,
      },
    });

    if (response.ok) {
      return response.json();
    }

    const error = await response.json().catch(() => ({}));
    lastError = new Error(
      error.message || `Afterpay API error: ${response.statusText}`
    );

    // Only retry on transient server errors
    if (!TRANSIENT_STATUS_CODES.includes(response.status)) {
      throw lastError;
    }
  }

  throw lastError!;
}

export function toMoney(amount: number, currency: string = "USD"): Money {
  return {
    amount: amount.toFixed(2),
    currency,
  };
}

export function cartToCheckoutItems(items: CartItem[]): CheckoutItem[] {
  return items.map((item) => ({
    name: item.product.name,
    sku: item.product.sku,
    quantity: item.quantity,
    price: toMoney(item.product.price, item.product.currency),
  }));
}

export async function createCheckout(
  request: CheckoutRequest
): Promise<CheckoutResponse> {
  return afterpayFetch<CheckoutResponse>("/v2/checkouts", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export interface AuthOptions {
  isCheckoutAdjusted?: boolean;
  paymentScheduleChecksum?: string;
}

export async function authorizePayment(
  token: string,
  requestId: string,
  amount?: Money,
  options?: AuthOptions
): Promise<AuthResponse> {
  const body: {
    token: string;
    requestId: string;
    amount?: Money;
    isCheckoutAdjusted?: boolean;
    paymentScheduleChecksum?: string;
  } = { token, requestId };

  if (amount) {
    body.amount = amount;
  }

  // Include adjustment fields for deferred shipping flow
  if (options?.isCheckoutAdjusted) {
    body.isCheckoutAdjusted = true;
    if (options.paymentScheduleChecksum) {
      body.paymentScheduleChecksum = options.paymentScheduleChecksum;
    }
  }

  return afterpayFetch<AuthResponse>("/v2/payments/auth", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface CaptureOptions {
  amount: Money;
  isCheckoutAdjusted?: boolean;
  paymentScheduleChecksum?: string;
}

export async function capturePayment(
  orderId: string,
  requestId: string,
  options: CaptureOptions
): Promise<CaptureResponse> {
  const body: {
    requestId: string;
    amount: Money;
    isCheckoutAdjusted?: boolean;
    paymentScheduleChecksum?: string;
  } = { requestId, amount: options.amount };

  // Include adjustment fields for deferred shipping flow
  if (options.isCheckoutAdjusted) {
    body.isCheckoutAdjusted = true;
    if (options.paymentScheduleChecksum) {
      body.paymentScheduleChecksum = options.paymentScheduleChecksum;
    }
  }

  return afterpayFetch<CaptureResponse>(`/v2/payments/${orderId}/capture`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function voidPayment(
  orderId: string,
  requestId: string,
  amount: Money
): Promise<CaptureResponse> {
  return afterpayFetch<CaptureResponse>(`/v2/payments/${orderId}/void`, {
    method: "POST",
    body: JSON.stringify({ requestId, amount }),
  });
}

export interface RefundResponse {
  refundId: string;
  refundedAt: string;
  merchantReference?: string;
  amount: Money;
}

export async function refundPayment(
  orderId: string,
  requestId: string,
  amount: Money,
  merchantReference?: string
): Promise<RefundResponse> {
  const body: { requestId: string; amount: Money; merchantReference?: string } = { requestId, amount };
  if (merchantReference) {
    body.merchantReference = merchantReference;
  }
  return afterpayFetch<RefundResponse>(`/v2/payments/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface PaymentDetails {
  id: string;
  token: string;
  status: string;
  created: string;
  originalAmount: Money;
  openToCaptureAmount: Money;
  paymentState: string;
  merchantReference?: string;
  events: PaymentEvent[];
  orderDetails?: {
    consumer?: {
      givenNames: string;
      surname: string;
      email: string;
    };
    shipping?: {
      name: string;
      line1: string;
      postcode: string;
      countryCode: string;
    };
  };
  refunds?: RefundResponse[];
}

export async function getPayment(orderId: string): Promise<PaymentDetails> {
  return afterpayFetch<PaymentDetails>(`/v2/payments/${orderId}`);
}

export async function getCheckout(token: string): Promise<CheckoutResponse> {
  return afterpayFetch<CheckoutResponse>(`/v2/checkouts/${token}`);
}

// Capture Full Payment - combines auth and capture in one call
// Used for Immediate Capture mode across all flows (Standard, Express, Cash App Pay)
export interface CaptureFullOptions {
  merchantReference?: string;
  amount?: Money;
  isCheckoutAdjusted?: boolean;
  paymentScheduleChecksum?: string;
}

export async function captureFullPayment(
  token: string,
  requestId: string,
  options?: CaptureFullOptions
): Promise<CaptureResponse> {
  const body: Record<string, unknown> = { token, requestId };
  if (options?.merchantReference) {
    body.merchantReference = options.merchantReference;
  }
  if (options?.amount) {
    body.amount = options.amount;
  }
  if (options?.isCheckoutAdjusted) {
    body.isCheckoutAdjusted = true;
    if (options.paymentScheduleChecksum) {
      body.paymentScheduleChecksum = options.paymentScheduleChecksum;
    }
  }
  return afterpayFetch<CaptureResponse>("/v2/payments/capture", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
