// lib/webhooks.ts

// Afterpay webhook event types
export type WebhookEventType =
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_VOIDED'
  | 'PAYMENT_AUTH_APPROVED'
  | 'PAYMENT_AUTH_DECLINED'
  | 'REFUND_SUCCESS'
  | 'REFUND_FAILED';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: {
    orderId?: string;
    orderToken?: string;
    amount?: { amount: string; currency: string };
    merchantReference?: string;
    [key: string]: unknown;
  };
}

export interface StoredWebhookEvent extends WebhookEvent {
  receivedAt: string;
  verified: boolean;
}

// Webhook storage key
const WEBHOOK_STORAGE_KEY = 'afterpay-webhook-events';

// Store webhook event (client-side for demo)
export function storeWebhookEvent(event: StoredWebhookEvent): void {
  if (typeof window === 'undefined') return;
  const events = getWebhookEvents();
  events.unshift(event); // Add to beginning
  // Keep only last 50 events
  const trimmed = events.slice(0, 50);
  localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(trimmed));
}

// Get stored webhook events
export function getWebhookEvents(): StoredWebhookEvent[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(WEBHOOK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Clear webhook events
export function clearWebhookEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WEBHOOK_STORAGE_KEY);
}

// Verify webhook signature (demo implementation)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // In production, use HMAC-SHA256 verification
  // This is a demo implementation
  if (!signature || !secret) return false;

  // For demo purposes, accept if signature header exists
  // Real implementation would compute HMAC and compare
  return signature.length > 0;
}

// Get human-readable event description
export function getEventDescription(type: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    PAYMENT_CAPTURED: 'Payment funds have been captured',
    PAYMENT_DECLINED: 'Payment was declined',
    PAYMENT_VOIDED: 'Authorized payment was voided',
    PAYMENT_AUTH_APPROVED: 'Payment authorization approved',
    PAYMENT_AUTH_DECLINED: 'Payment authorization declined',
    REFUND_SUCCESS: 'Refund processed successfully',
    REFUND_FAILED: 'Refund processing failed',
  };
  return descriptions[type] || 'Unknown event';
}

// Get event badge color for UI
export function getEventBadgeColor(type: WebhookEventType): string {
  const colors: Record<WebhookEventType, string> = {
    PAYMENT_CAPTURED: 'bg-green-100 text-green-800',
    PAYMENT_DECLINED: 'bg-red-100 text-red-800',
    PAYMENT_VOIDED: 'bg-red-100 text-red-800',
    PAYMENT_AUTH_APPROVED: 'bg-blue-100 text-blue-800',
    PAYMENT_AUTH_DECLINED: 'bg-red-100 text-red-800',
    REFUND_SUCCESS: 'bg-orange-100 text-orange-800',
    REFUND_FAILED: 'bg-red-100 text-red-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}
