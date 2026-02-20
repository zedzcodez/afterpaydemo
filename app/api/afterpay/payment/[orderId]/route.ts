import { NextRequest, NextResponse } from "next/server";
import { getPayment, API_URL } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const startTime = Date.now();
  try {
    const { orderId } = await params;

    if (!orderId || !/^[a-zA-Z0-9-]+$/.test(orderId)) {
      return NextResponse.json(
        { error: "Order ID is required and must be alphanumeric" },
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
    const safeMessage = sanitizeError(error, "get-payment");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
