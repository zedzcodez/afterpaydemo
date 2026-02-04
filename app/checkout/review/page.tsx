"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { addFlowLog, getFlowLogs } from "@/lib/flowLogs";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("orderToken");
    const status = searchParams.get("status");

    if (status === "CANCELLED" || status === "cancelled") {
      setError("Checkout was cancelled");
      addFlowLog({
        type: "callback",
        label: "Customer returned from Afterpay",
        data: { status: "CANCELLED" },
      });
      return;
    }

    if (token) {
      setOrderToken(token);
      addFlowLog({
        type: "callback",
        label: "Customer returned from Afterpay",
        data: { status: "SUCCESS", orderToken: token.substring(0, 20) + "..." },
      });
    } else {
      setError("No order token found");
    }
  }, [searchParams]);

  const handlePlaceOrder = async () => {
    if (!orderToken) return;

    setIsProcessing(true);
    setError(null);

    // Check capture mode from localStorage
    const captureMode = localStorage.getItem("afterpay_capture_mode") || "deferred";
    const isImmediateCapture = captureMode === "immediate";

    try {
      let orderId: string;

      if (isImmediateCapture) {
        // Immediate Capture Mode: Use Capture Full Payment API (combines auth + capture)
        const captureFullRequest = { token: orderToken };

        addFlowLog({
          type: "api_request",
          label: "Capture Full Payment (Immediate Mode)",
          method: "POST",
          endpoint: "/api/afterpay/capture-full → /v2/payments/capture",
          data: captureFullRequest,
        });

        const startTime = Date.now();
        const response = await fetch("/api/afterpay/capture-full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captureFullRequest),
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        addFlowLog({
          type: "api_response",
          label: "Capture Full Response",
          method: "POST",
          endpoint: "/v2/payments/capture",
          status: response.status,
          data: data,
          duration,
        });

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.status !== "APPROVED") {
          throw new Error("Payment was not approved");
        }

        orderId = data.id;
      } else {
        // Deferred Capture Mode: Only authorize, capture later from Admin Panel
        const authRequest = { token: orderToken };

        addFlowLog({
          type: "api_request",
          label: "Authorize Payment (Deferred Mode)",
          method: "POST",
          endpoint: "/api/afterpay/auth → /v2/payments/auth",
          data: authRequest,
        });

        const startTime = Date.now();
        const response = await fetch("/api/afterpay/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authRequest),
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        addFlowLog({
          type: "api_response",
          label: "Authorization Response",
          method: "POST",
          endpoint: "/v2/payments/auth",
          status: response.status,
          data: data,
          duration,
        });

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.status !== "APPROVED") {
          throw new Error("Payment was not approved");
        }

        orderId = data.id;
      }

      // Clear cart and redirect to confirmation
      clearCart();

      const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
      addFlowLog({
        type: "redirect",
        label: "Redirect to Confirmation",
        endpoint: `/confirmation?orderId=${orderId}&status=success&flow=standard-${flowSuffix}`,
      });

      router.push(`/confirmation?orderId=${orderId}&status=success&flow=standard-${flowSuffix}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment processing failed");
      setIsProcessing(false);
    }
  };

  if (error && !orderToken) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Checkout Cancelled</h1>
        <p className="text-afterpay-gray-600 mb-6">{error}</p>
        <Link
          href="/checkout"
          className="inline-block px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
        >
          Return to Checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-72">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Review Your Order</h1>
        <p className="text-afterpay-gray-600">
          Please review your order details before completing your purchase.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white border border-afterpay-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-gray-50 border-b border-afterpay-gray-200">
          <h2 className="font-semibold">Order Summary</h2>
        </div>
        <div className="p-6">
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-afterpay-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{item.product.image}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-afterpay-gray-600">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
              <div className="border-t border-afterpay-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-afterpay-gray-600">
              Your cart is empty. The order total will be processed from your Afterpay session.
            </p>
          )}
        </div>
      </div>

      {/* Afterpay Payment Info */}
      <div className="bg-afterpay-mint/20 border border-afterpay-mint rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-afterpay-mint text-afterpay-black px-2 py-1 rounded text-sm font-bold">
            Afterpay
          </span>
          <span className="font-medium">Payment Confirmed</span>
        </div>
        <p className="text-sm text-afterpay-gray-700">
          Your payment schedule has been set up with Afterpay. Click &quot;Place Order&quot; below
          to complete your purchase. You&apos;ll pay in 4 interest-free installments.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handlePlaceOrder}
          disabled={isProcessing || !orderToken}
          className="flex-1 py-4 px-6 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </>
          ) : (
            <>
              Place Order
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </>
          )}
        </button>
        <Link
          href="/checkout"
          className="flex-1 py-4 px-6 bg-white text-afterpay-black text-center font-medium rounded-lg border-2 border-afterpay-gray-300 hover:border-afterpay-gray-400 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Note */}
      <p className="text-xs text-afterpay-gray-500 text-center mt-6">
        By clicking &quot;Place Order&quot;, you agree to complete your purchase using Afterpay.
        Your payment will be authorized and captured.
      </p>

      {/* Developer Panel */}
      <FlowLogsDevPanel />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-afterpay-gray-600">Loading order details...</p>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
