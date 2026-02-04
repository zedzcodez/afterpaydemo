"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { addFlowLog } from "@/lib/flowLogs";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";
import { CheckoutProgress } from "@/components/CheckoutProgress";

// Declare Afterpay widget types
declare global {
  interface Window {
    AfterPay?: {
      Widgets: {
        PaymentSchedule: new (config: PaymentScheduleConfig) => PaymentScheduleWidget;
      };
    };
  }
}

interface PaymentScheduleConfig {
  token: string;
  amount: { amount: string; currency: string };
  target: string;
  locale?: string;
  onReady?: (event: { data: object }) => void;
  onChange?: (event: { data: { paymentScheduleChecksum: string; isValid: boolean } }) => void;
  onError?: (event: { data: { error: string } }) => void;
}

interface PaymentScheduleWidget {
  update: (config: { amount: { amount: string; currency: string } }) => void;
  paymentScheduleChecksum: string;
}

const SHIPPING_OPTIONS = [
  {
    id: "standard",
    name: "Standard Shipping",
    description: "5-7 business days",
    price: 5.99,
  },
  {
    id: "express",
    name: "Express Shipping",
    description: "2-3 business days",
    price: 12.99,
  },
  {
    id: "overnight",
    name: "Overnight Shipping",
    description: "Next business day",
    price: 24.99,
  },
];

function ShippingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_OPTIONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [checksum, setChecksum] = useState<string | null>(null);

  const widgetRef = useRef<PaymentScheduleWidget | null>(null);
  const widgetInitialized = useRef(false);

  const finalTotal = total + selectedShipping.price;

  // Initialize the widget when token is available
  const initializeWidget = useCallback((token: string) => {
    if (widgetInitialized.current || !window.AfterPay) return;

    widgetInitialized.current = true;

    const initialAmount = {
      amount: (total + SHIPPING_OPTIONS[0].price).toFixed(2),
      currency: "USD"
    };

    addFlowLog({
      type: "callback",
      label: "Initialize Payment Schedule Widget",
      data: { token: token.substring(0, 20) + "...", amount: initialAmount },
    });

    try {
      widgetRef.current = new window.AfterPay.Widgets.PaymentSchedule({
        token,
        amount: initialAmount,
        target: "#afterpay-widget",
        locale: "en-US",
        onReady: (event) => {
          console.log("Widget ready:", event);
          setWidgetReady(true);
          addFlowLog({
            type: "callback",
            label: "Widget Ready",
            data: event.data,
          });
        },
        onChange: (event) => {
          console.log("Widget changed:", event);
          setChecksum(event.data.paymentScheduleChecksum);
          addFlowLog({
            type: "callback",
            label: "Widget Updated",
            data: {
              paymentScheduleChecksum: event.data.paymentScheduleChecksum?.substring(0, 20) + "...",
              isValid: event.data.isValid
            },
          });
        },
        onError: (event) => {
          console.error("Widget error:", event);
          addFlowLog({
            type: "callback",
            label: "Widget Error",
            data: event.data,
          });
        },
      });
    } catch (err) {
      console.error("Failed to initialize widget:", err);
    }
  }, [total]);

  useEffect(() => {
    const token = searchParams.get("token");
    const flow = searchParams.get("flow");

    if (token && flow === "deferred") {
      setOrderToken(token);
      addFlowLog({
        type: "callback",
        label: "Customer returned for shipping selection",
        data: { flow: "deferred", token: token.substring(0, 20) + "..." },
      });

      // Wait for AfterPay to be available, then initialize widget
      const checkAndInit = () => {
        if (window.AfterPay) {
          initializeWidget(token);
        } else {
          setTimeout(checkAndInit, 100);
        }
      };
      checkAndInit();
    } else {
      setError("Invalid checkout session");
    }
  }, [searchParams, initializeWidget]);

  // Update widget when shipping option changes
  useEffect(() => {
    if (widgetRef.current && widgetReady) {
      const newAmount = {
        amount: finalTotal.toFixed(2),
        currency: "USD"
      };

      addFlowLog({
        type: "callback",
        label: "Update Widget Amount",
        data: { shipping: selectedShipping.name, amount: newAmount },
      });

      widgetRef.current.update({ amount: newAmount });
    }
  }, [selectedShipping, finalTotal, widgetReady]);

  const handlePlaceOrder = async () => {
    if (!orderToken) return;

    // Get the latest checksum from the widget
    const paymentScheduleChecksum = widgetRef.current?.paymentScheduleChecksum || checksum;

    if (!paymentScheduleChecksum) {
      setError("Payment schedule not ready. Please wait and try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Check capture mode from localStorage
    const captureMode = localStorage.getItem("afterpay_capture_mode") || "deferred";
    const isImmediateCapture = captureMode === "immediate";

    try {
      let orderId: string;

      // Authorize with adjusted amount + checksum (for deferred shipping)
      const authRequest = {
        token: orderToken,
        amount: finalTotal,
        isCheckoutAdjusted: true,
        paymentScheduleChecksum,
      };

      addFlowLog({
        type: "api_request",
        label: `Authorize Payment (${isImmediateCapture ? "Immediate" : "Deferred"} Mode)`,
        method: "POST",
        endpoint: "/api/afterpay/auth → /v2/payments/auth",
        data: {
          ...authRequest,
          paymentScheduleChecksum: paymentScheduleChecksum.substring(0, 20) + "...",
        },
      });

      const authStartTime = Date.now();
      const authResponse = await fetch("/api/afterpay/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authRequest),
      });

      const authData = await authResponse.json();
      const authDuration = Date.now() - authStartTime;

      addFlowLog({
        type: "api_response",
        label: "Authorization Response",
        method: "POST",
        endpoint: "/v2/payments/auth",
        status: authResponse.status,
        data: authData,
        duration: authDuration,
      });

      if (authData.error) {
        throw new Error(authData.error);
      }

      if (authData.status !== "APPROVED") {
        throw new Error("Payment was not approved");
      }

      orderId = authData.id;

      // Only capture immediately if in Immediate Capture mode
      if (isImmediateCapture) {
        const captureRequest = {
          orderId: authData.id,
          amount: finalTotal,
          isCheckoutAdjusted: true,
          paymentScheduleChecksum,
        };

        addFlowLog({
          type: "api_request",
          label: "Capture Payment (Immediate Mode)",
          method: "POST",
          endpoint: `/api/afterpay/capture → /v2/payments/${authData.id}/capture`,
          data: {
            ...captureRequest,
            paymentScheduleChecksum: paymentScheduleChecksum.substring(0, 20) + "...",
          },
        });

        const captureStartTime = Date.now();
        const captureResponse = await fetch("/api/afterpay/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captureRequest),
        });

        const captureData = await captureResponse.json();
        const captureDuration = Date.now() - captureStartTime;

        addFlowLog({
          type: "api_response",
          label: "Capture Response",
          method: "POST",
          endpoint: `/v2/payments/${authData.id}/capture`,
          status: captureResponse.status,
          data: captureData,
          duration: captureDuration,
        });

        if (captureData.error) {
          throw new Error(captureData.error);
        }
      }

      // Clear cart and redirect to confirmation
      clearCart();

      const flowSuffix = isImmediateCapture ? "immediate" : "deferred";
      addFlowLog({
        type: "redirect",
        label: "Redirect to Confirmation",
        endpoint: `/confirmation?orderId=${orderId}&status=success&flow=express-deferred-${flowSuffix}`,
      });

      router.push(`/confirmation?orderId=${orderId}&status=success&flow=express-deferred-${flowSuffix}`);
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
        <h1 className="text-2xl font-bold mb-2">Invalid Session</h1>
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
      {/* Progress Timeline */}
      <CheckoutProgress currentStep="shipping" showShipping />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Select Shipping Method</h1>
        <p className="text-afterpay-gray-600">
          Choose your preferred shipping option to complete your order.
        </p>
      </div>

      {/* Afterpay Payment Schedule Widget */}
      <div className="bg-white border border-afterpay-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-mint/20 border-b border-afterpay-mint">
          <div className="flex items-center gap-3">
            <span className="bg-afterpay-mint text-afterpay-black px-2 py-1 rounded text-sm font-bold">
              Afterpay
            </span>
            <span className="font-medium">Payment Schedule</span>
          </div>
        </div>
        <div className="p-6">
          {/* Widget container */}
          <div id="afterpay-widget" className="min-h-[100px]">
            {!widgetReady && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-afterpay-mint border-t-transparent rounded-full mr-3" />
                <span className="text-afterpay-gray-600">Loading payment schedule...</span>
              </div>
            )}
          </div>
        </div>
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
                  <div className="w-12 h-12 bg-afterpay-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-afterpay-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-sm">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-afterpay-gray-600 text-sm">Cart items will be processed from your session.</p>
          )}
        </div>
      </div>

      {/* Shipping Options */}
      <div className="bg-white border border-afterpay-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-gray-50 border-b border-afterpay-gray-200">
          <h2 className="font-semibold">Shipping Method</h2>
        </div>
        <div className="p-6 space-y-3">
          {SHIPPING_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedShipping.id === option.id
                  ? "border-afterpay-mint bg-afterpay-mint/10"
                  : "border-afterpay-gray-200 hover:border-afterpay-gray-300"
              }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="shipping"
                  value={option.id}
                  checked={selectedShipping.id === option.id}
                  onChange={() => setSelectedShipping(option)}
                  className="mr-3"
                />
                <div>
                  <span className="font-medium">{option.name}</span>
                  <p className="text-sm text-afterpay-gray-600">{option.description}</p>
                </div>
              </div>
              <span className="font-medium">{formatPrice(option.price)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Order Total */}
      <div className="bg-afterpay-gray-50 rounded-lg p-6 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatPrice(selectedShipping.price)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t border-afterpay-gray-200 pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>
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
          disabled={isProcessing || !orderToken || !widgetReady}
          className="flex-1 py-4 px-6 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </>
          ) : (
            <>
              Place Order - {formatPrice(finalTotal)}
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
        By clicking &quot;Place Order&quot;, your payment will be authorized and captured through Afterpay.
      </p>

      {/* Developer Panel */}
      <FlowLogsDevPanel />
    </div>
  );
}

export default function ShippingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-afterpay-gray-600">Loading shipping options...</p>
        </div>
      }
    >
      <ShippingContent />
    </Suspense>
  );
}
