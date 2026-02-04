import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/afterpay";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const response = await getPayment(orderId);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get payment details" },
      { status: 500 }
    );
  }
}
