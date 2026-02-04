import { NextRequest, NextResponse } from "next/server";
import { capturePayment, toMoney } from "@/lib/afterpay";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      orderId,
      amount,
      currency = "USD",
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    }: {
      orderId: string;
      amount: number;
      currency?: string;
      isCheckoutAdjusted?: boolean;
      paymentScheduleChecksum?: string;
    } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "Order ID and amount are required" },
        { status: 400 }
      );
    }

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
    console.error("Capture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture failed" },
      { status: 500 }
    );
  }
}
