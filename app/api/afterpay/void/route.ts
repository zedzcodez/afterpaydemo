import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { voidPayment, toMoney } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { voidRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(voidRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { orderId, amount, currency } = validation.data;

    const voidAmount = toMoney(amount, currency);
    const requestBody = { requestId, amount: voidAmount };

    const response = await voidPayment(orderId, requestId, voidAmount);
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        fullUrl: `${API_URL}/v2/payments/${orderId}/void`,
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
    const safeMessage = sanitizeError(error, "void");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
