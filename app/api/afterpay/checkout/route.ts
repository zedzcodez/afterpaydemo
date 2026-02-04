import { NextRequest, NextResponse } from "next/server";
import { createCheckout, toMoney, cartToCheckoutItems } from "@/lib/afterpay";
import { CartItem } from "@/lib/types";

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
    const {
      items,
      total,
      mode = "standard",
      consumer,
      shipping,
    }: {
      items: CartItem[];
      total: number;
      mode?: "standard" | "express";
      consumer?: {
        givenNames: string;
        surname: string;
        email: string;
        phoneNumber?: string;
      };
      shipping?: {
        name: string;
        line1: string;
        line2?: string;
        area1: string;
        area2?: string;
        postcode: string;
        countryCode: string;
        phoneNumber?: string;
      };
    } = body;

    // CRITICAL: appUrl must exactly match the protocol, host, and port where the app is running.
    // This is used for redirectConfirmUrl, redirectCancelUrl, and popupOriginUrl.
    // If popupOriginUrl doesn't match the actual origin of the page opening the popup,
    // the browser will NOT dispatch the JavaScript onComplete event, causing the popup
    // flow to fail silently with a "cancelled" status.
    // See: https://developers.afterpay.com/afterpay-online/reference/popup-method
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const merchantReference = generateMerchantReference();

    // Standard checkout redirects to review page, Express uses popup callbacks
    const redirectConfirmUrl = mode === "standard"
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
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
