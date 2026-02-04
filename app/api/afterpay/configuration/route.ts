import { NextRequest, NextResponse } from "next/server";
import { sanitizeError } from "@/lib/errors";

export interface ConfigurationResponse {
  minimumAmount?: {
    amount: string;
    currency: string;
  };
  maximumAmount?: {
    amount: string;
    currency: string;
  };
}

// Get Afterpay merchant configuration
// Uses environment variables for credentials (AFTERPAY_MERCHANT_ID, AFTERPAY_SECRET_KEY)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // Always use environment variables for credentials
    const merchantId = process.env.AFTERPAY_MERCHANT_ID;
    const secretKey = process.env.AFTERPAY_SECRET_KEY;
    const apiUrl = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

    if (!merchantId || !secretKey) {
      return NextResponse.json(
        { error: "Merchant credentials not configured. Set AFTERPAY_MERCHANT_ID and AFTERPAY_SECRET_KEY environment variables." },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

    const response = await fetch(`${apiUrl}/v2/configuration`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "User-Agent": "Afterpay-Demo-App/1.0",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `API error: ${response.statusText}`;
      const safeMessage = sanitizeError(new Error(errorMessage), "configuration");
      return NextResponse.json(
        {
          error: safeMessage,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data: ConfigurationResponse = await response.json();
    const duration = Date.now() - startTime;

    // Return response with metadata for Developer Panel
    return NextResponse.json({
      ...data,
      _meta: {
        fullUrl: `${apiUrl}/v2/configuration`,
        method: "GET",
        duration,
        headers: {
          contentType: "application/json",
          authorization: "Basic ***",
          userAgent: "Afterpay-Demo-App/1.0",
        },
      },
    });
  } catch (error) {
    const safeMessage = sanitizeError(error, "configuration");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
