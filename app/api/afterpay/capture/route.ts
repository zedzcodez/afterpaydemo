import { NextRequest, NextResponse } from "next/server";
import { capturePayment, toMoney } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { captureRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(captureRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { orderId, amount, currency, isCheckoutAdjusted, paymentScheduleChecksum } = validation.data;

    const captureAmount = toMoney(amount, currency);
    const requestBody: Record<string, unknown> = { amount: captureAmount };
    if (isCheckoutAdjusted) {
      requestBody.isCheckoutAdjusted = isCheckoutAdjusted;
      if (paymentScheduleChecksum) {
        requestBody.paymentScheduleChecksum = paymentScheduleChecksum;
      }
    }

    const response = await capturePayment(orderId, {
      amount: captureAmount,
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        fullUrl: `${API_URL}/v2/payments/${orderId}/capture`,
        method: "POST",
        duration,
        requestBody,
        pathParams: { orderId },
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
        },
      },
    });
  } catch (error) {
    const safeMessage = sanitizeError(error, "capture");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
