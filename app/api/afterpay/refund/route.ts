import { NextRequest, NextResponse } from "next/server";
import { refundPayment, toMoney } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      orderId,
      amount,
      currency = "USD",
      merchantReference,
    }: {
      orderId: string;
      amount: number;
      currency?: string;
      merchantReference?: string;
    } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "Order ID and amount are required" },
        { status: 400 }
      );
    }

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
