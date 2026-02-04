import { NextRequest, NextResponse } from "next/server";
import { captureFullPayment } from "@/lib/afterpay";

// Capture Full Payment - combines auth and capture in one call
// Used for Immediate Capture mode
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, merchantReference }: { token: string; merchantReference?: string } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const response = await captureFullPayment(token, merchantReference);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Capture Full error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture failed" },
      { status: 500 }
    );
  }
}
