import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { captureFullPayment, getCheckout, toMoney, API_URL } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { captureFullRequestSchema, validateRequest } from "@/lib/validation";

// Capture Full Payment - combines auth and capture in one call
// Used for Immediate Capture mode across all flows (Standard, Express, Cash App Pay)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(captureFullRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { token, merchantReference, amount, isCheckoutAdjusted, paymentScheduleChecksum } = validation.data;

    // For Express Checkout with integrated shipping, the client may not know the
    // final order amount (the SDK's onShippingOptionChange callback is unreliable).
    // If no amount is provided, fetch the checkout to get the authoritative amount.
    let resolvedAmount = amount ? toMoney(amount) : undefined;
    if (!resolvedAmount) {
      try {
        const checkout = await getCheckout(token);
        if (checkout.amount) {
          resolvedAmount = checkout.amount;
        }
      } catch (err) {
        console.warn("[capture-full] Could not fetch checkout for amount resolution:", err);
      }
    }

    const requestBody: Record<string, unknown> = { requestId, token };
    if (merchantReference) {
      requestBody.merchantReference = merchantReference;
    }
    if (resolvedAmount) {
      requestBody.amount = resolvedAmount;
    }
    if (isCheckoutAdjusted) {
      requestBody.isCheckoutAdjusted = isCheckoutAdjusted;
      if (paymentScheduleChecksum) {
        requestBody.paymentScheduleChecksum = paymentScheduleChecksum;
      }
    }

    const response = await captureFullPayment(token, requestId, {
      merchantReference,
      amount: resolvedAmount,
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        fullUrl: `${API_URL}/v2/payments/capture`,
        method: "POST",
        duration,
        requestBody,
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error, "capture-full") }, { status: 500 });
  }
}
