import { NextRequest, NextResponse } from "next/server";
import { refundPayment, toMoney } from "@/lib/afterpay";

export async function POST(request: NextRequest) {
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

    const response = await refundPayment(
      orderId,
      toMoney(amount, currency),
      merchantReference
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refund failed" },
      { status: 500 }
    );
  }
}
