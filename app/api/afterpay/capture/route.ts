import { NextRequest, NextResponse } from "next/server";
import { capturePayment, toMoney } from "@/lib/afterpay";

export async function POST(request: NextRequest) {
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

    const response = await capturePayment(orderId, {
      amount: toMoney(amount, currency),
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Capture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture failed" },
      { status: 500 }
    );
  }
}
