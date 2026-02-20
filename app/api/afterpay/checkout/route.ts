import { NextRequest, NextResponse } from "next/server";
import { createCheckout, toMoney, cartToCheckoutItems } from "@/lib/afterpay";
import { sanitizeError } from "@/lib/errors";
import { checkoutRequestSchema, validateRequest } from "@/lib/validation";

const API_URL = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

// Generate a unique merchant reference/order ID
function generateMerchantReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(checkoutRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { items, total, mode, consumer, shipping, isCashAppPay } = validation.data;

    // CRITICAL: appUrl must exactly match the protocol, host, and port where the app is running.
    // This is used for redirectConfirmUrl, redirectCancelUrl, and popupOriginUrl.
    // If popupOriginUrl doesn't match the actual origin of the page opening the popup,
    // the browser will NOT dispatch the JavaScript onComplete event, causing the popup
    // flow to fail silently with a "cancelled" status.
    // See: https://developers.afterpay.com/afterpay-online/reference/popup-method
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const merchantReference = generateMerchantReference();

    // Standard checkout redirects to review page, Express uses popup callbacks
    const redirectConfirmUrl = isCashAppPay
      ? `${appUrl}/confirmation?cashAppPay=true`
      : mode === "standard"
        ? `${appUrl}/checkout/review`
        : `${appUrl}/confirmation`;

    const checkoutRequest = {
      amount: toMoney(total),
      consumer,
      shipping,
      items: cartToCheckoutItems(items),
      merchantReference,
      merchant: {
        redirectConfirmUrl,
        redirectCancelUrl: `${appUrl}/checkout`,
        // popupOriginUrl MUST match window.location.origin exactly for popup flow to work
        popupOriginUrl: appUrl,
      },
      mode,
      ...(isCashAppPay && { isCashAppPay: true }),
    };

    const response = await createCheckout(checkoutRequest);
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...response,
      _meta: {
        fullUrl: `${API_URL}/v2/checkouts`,
        method: "POST",
        duration,
        requestBody: checkoutRequest,
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
        },
      },
    });
  } catch (error) {
    const safeMessage = sanitizeError(error, "checkout");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
