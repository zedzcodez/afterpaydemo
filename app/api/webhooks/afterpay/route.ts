// app/api/webhooks/afterpay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, verifyWebhookSignature } from '@/lib/webhooks';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-afterpay-signature') || '';
    const webhookSecret = process.env.AFTERPAY_WEBHOOK_SECRET || 'demo-secret';

    // Verify signature (demo - always passes in sandbox if signature exists)
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

    // Parse the event
    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error('[Webhook] Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log the webhook event
    console.log(`[Webhook] Received ${event.type}:`, {
      id: event.id,
      orderId: event.data?.orderId,
      verified: isValid,
    });

    // Process based on event type
    switch (event.type) {
      case 'PAYMENT_CAPTURED':
        console.log('[Webhook] Payment captured:', event.data.orderId);
        // In production: Update order status in database
        // In production: Send confirmation email to customer
        // In production: Update inventory/fulfillment system
        break;
      case 'PAYMENT_VOIDED':
        console.log('[Webhook] Payment voided:', event.data.orderId);
        // In production: Mark order as cancelled
        // In production: Release reserved inventory
        break;
      case 'REFUND_SUCCESS':
        console.log('[Webhook] Refund successful:', event.data.orderId);
        // In production: Update order refund status
        // In production: Send refund confirmation to customer
        break;
      case 'PAYMENT_AUTH_APPROVED':
        console.log('[Webhook] Auth approved:', event.data.orderId);
        // In production: Mark order as ready for fulfillment
        break;
      case 'PAYMENT_DECLINED':
      case 'PAYMENT_AUTH_DECLINED':
        console.log('[Webhook] Payment declined:', event.data.orderId);
        // In production: Mark order as payment failed
        // In production: Notify customer of payment issue
        break;
      case 'REFUND_FAILED':
        console.log('[Webhook] Refund failed:', event.data.orderId);
        // In production: Flag for manual review
        // In production: Notify support team
        break;
      default:
        console.log('[Webhook] Unknown event type:', event.type);
    }

    const duration = Date.now() - startTime;

    // Return success with metadata for demo
    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
      verified: isValid,
      _meta: {
        duration,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/afterpay',
    description: 'Demo webhook endpoint for Afterpay payment notifications',
    note: 'This endpoint simulates how merchants receive async payment notifications from Afterpay',
    supportedEvents: [
      'PAYMENT_CAPTURED',
      'PAYMENT_DECLINED',
      'PAYMENT_VOIDED',
      'PAYMENT_AUTH_APPROVED',
      'PAYMENT_AUTH_DECLINED',
      'REFUND_SUCCESS',
      'REFUND_FAILED',
    ],
    documentation: 'https://developers.afterpay.com/afterpay-online/reference/webhook-events',
  });
}
