import { NextRequest, NextResponse } from "next/server";

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
// Supports custom credentials passed in request body, or falls back to env vars
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const { merchantId, secretKey } = body as {
      merchantId?: string;
      secretKey?: string;
    };

    // Use custom credentials if provided, otherwise fall back to env vars
    const useMerchantId = merchantId || process.env.AFTERPAY_MERCHANT_ID;
    const useSecretKey = secretKey || process.env.AFTERPAY_SECRET_KEY;
    const apiUrl = process.env.AFTERPAY_API_URL || "https://global-api-sandbox.afterpay.com";

    if (!useMerchantId || !useSecretKey) {
      return NextResponse.json(
        { error: "Merchant ID and Secret Key are required" },
        { status: 400 }
      );
    }

    const credentials = Buffer.from(`${useMerchantId}:${useSecretKey}`).toString("base64");

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
      return NextResponse.json(
        {
          error: errorData.message || `API error: ${response.statusText}`,
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
      usingCustomCredentials: !!(merchantId && secretKey),
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
    console.error("Configuration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get configuration" },
      { status: 500 }
    );
  }
}
