import { NextRequest, NextResponse } from "next/server";
import { authorizePayment, getCheckout, toMoney } from "@/lib/afterpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      amount,
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    }: {
      token: string;
      amount?: number;
      isCheckoutAdjusted?: boolean;
      paymentScheduleChecksum?: string;
    } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    let authAmount;

    if (amount !== undefined) {
      // Deferred shipping flow: use the provided amount (includes shipping selected on merchant site)
      authAmount = toMoney(amount);
    } else {
      // Integrated shipping flow: get the final amount from checkout (includes shipping selected in popup)
      const checkout = await getCheckout(token);
      authAmount = checkout.amount;
    }

    // Authorize with the determined amount and optional adjustment fields
    const response = await authorizePayment(token, authAmount, {
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Authorization error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authorization failed" },
      { status: 500 }
    );
  }
}
