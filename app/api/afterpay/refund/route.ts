import { NextRequest, NextResponse } from "next/server";
import { refundPayment, toMoney } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { refundRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(refundRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { orderId, amount, currency, merchantReference } = validation.data;

    const refundAmount = toMoney(amount, currency);
    const requestBody: Record<string, unknown> = { amount: refundAmount };
    if (merchantReference) {
      requestBody.merchantReference = merchantReference;
    }

    const response = await refundPayment(
      orderId,
      refundAmount,
      merchantReference
    );
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        fullUrl: `${API_URL}/v2/payments/${orderId}/refund`,
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
    const safeMessage = sanitizeError(error, "refund");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
