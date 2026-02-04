import { NextRequest, NextResponse } from "next/server";
import { voidPayment, toMoney } from "@/lib/afterpay";

export async function POST(request: NextRequest) {
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

    const response = await voidPayment(orderId, toMoney(amount, currency));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Void error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Void failed" },
      { status: 500 }
    );
  }
}
