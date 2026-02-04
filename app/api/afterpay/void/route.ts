import { NextRequest, NextResponse } from "next/server";
import { voidPayment, toMoney } from "@/lib/afterpay";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      orderId,
      amount,
      currency = "USD",
    }: { orderId: string; amount: number; currency?: string } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "Order ID and amount are required" },
        { status: 400 }
      );
    }

    const voidAmount = toMoney(amount, currency);
    const requestBody = { amount: voidAmount };

    const response = await voidPayment(orderId, voidAmount);
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
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
    console.error("Void error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Void failed" },
      { status: 500 }
    );
  }
}
