import { NextRequest, NextResponse } from "next/server";
import { captureFullPayment } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { captureFullRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

// Capture Full Payment - combines auth and capture in one call
// Used for Immediate Capture mode
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(captureFullRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { token, merchantReference } = validation.data;

    const requestBody: Record<string, unknown> = { token };
    if (merchantReference) {
      requestBody.merchantReference = merchantReference;
    }

    const response = await captureFullPayment(token, merchantReference);
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
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
    const safeMessage = sanitizeError(error, "capture-full");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
