import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authorizePayment, getCheckout, toMoney } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { authRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(authRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { token, amount, isCheckoutAdjusted, paymentScheduleChecksum } = validation.data;

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
    const requestBody: Record<string, unknown> = { requestId, token, amount: authAmount };
    if (isCheckoutAdjusted) {
      requestBody.isCheckoutAdjusted = isCheckoutAdjusted;
      if (paymentScheduleChecksum) {
        requestBody.paymentScheduleChecksum = paymentScheduleChecksum;
      }
    }

    // Authorize with the determined amount and optional adjustment fields
    const response = await authorizePayment(token, requestId, authAmount, {
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
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
    const safeMessage = sanitizeError(error, "auth");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
