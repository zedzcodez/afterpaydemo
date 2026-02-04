import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/afterpay";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const startTime = Date.now();
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const response = await getPayment(orderId);
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        fullUrl: `${API_URL}/v2/payments/${orderId}`,
        method: "GET",
        duration,
        pathParams: { orderId },
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
        },
      },
    });
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get payment details" },
      { status: 500 }
    );
  }
}
