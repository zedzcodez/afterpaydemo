import { NextRequest, NextResponse } from "next/server";
import { authorizePayment, getCheckout, toMoney } from "@/lib/afterpay";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
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

    // Build request body for logging
    const requestBody: Record<string, unknown> = { token, amount: authAmount };
    if (isCheckoutAdjusted) {
      requestBody.isCheckoutAdjusted = isCheckoutAdjusted;
      if (paymentScheduleChecksum) {
        requestBody.paymentScheduleChecksum = paymentScheduleChecksum;
      }
    }

    // Authorize with the determined amount and optional adjustment fields
    const response = await authorizePayment(token, authAmount, {
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        fullUrl: `${API_URL}/v2/payments/auth`,
        method: "POST",
        duration,
        requestBody,
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
        },
      },
    });
  } catch (error) {
    console.error("Authorization error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authorization failed" },
      { status: 500 }
    );
  }
}
