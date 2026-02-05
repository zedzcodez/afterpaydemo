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
  theme?: "light" | "dark";
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
  const { items, total } = useCart();
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_OPTIONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [checksum, setChecksum] = useState<string | null>(null);
  const [storedCartTotal, setStoredCartTotal] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const widgetRef = useRef<PaymentScheduleWidget | null>(null);
  const widgetInitialized = useRef(false);

  // Use stored cart total from sessionStorage, fallback to cart context
  const cartTotal = storedCartTotal ?? total;
  const finalTotal = cartTotal + selectedShipping.price;

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Load stored cart data on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('afterpay_checkout_cart');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setStoredCartTotal(parsed.total || 0);
      } catch {
        // Fall back to cart context
      }
    }
  }, []);

  // Initialize the widget when token is available
  const initializeWidget = useCallback((token: string, baseTotal: number) => {
    if (widgetInitialized.current || !window.AfterPay) return;

    widgetInitialized.current = true;

    const initialAmount = {
      amount: (baseTotal + SHIPPING_OPTIONS[0].price).toFixed(2),
      currency: "USD"
    };

    addFlowLog({
      type: "callback",
      label: "Initialize Payment Schedule Widget",
      data: { token: token.substring(0, 20) + "...", amount: initialAmount },
    });

    try {
      // Check current dark mode state
      const currentDarkMode = document.documentElement.classList.contains("dark");

      widgetRef.current = new window.AfterPay.Widgets.PaymentSchedule({
        token,
        amount: initialAmount,
        target: "#afterpay-widget",
        locale: "en-US",
        theme: currentDarkMode ? "dark" : "light",
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
  }, []);

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
    } else {
      setError("Invalid checkout session");
    }
  }, [searchParams]);

  // Initialize widget only after we have the stored cart total
  useEffect(() => {
    if (!orderToken || storedCartTotal === null) return;

    // Wait for AfterPay to be available, then initialize widget
    const checkAndInit = () => {
      if (window.AfterPay) {
        initializeWidget(orderToken, storedCartTotal);
      } else {
        setTimeout(checkAndInit, 100);
      }
    };
    checkAndInit();
  }, [orderToken, storedCartTotal, initializeWidget]);

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
      const authClientRequest = {
        token: orderToken,
        amount: finalTotal,
        isCheckoutAdjusted: true,
        paymentScheduleChecksum,
      };

      const authStartTime = Date.now();
      const authResponse = await fetch("/api/afterpay/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authClientRequest),
      });

      const authData = await authResponse.json();
      const authDuration = Date.now() - authStartTime;

      // Log request with FULL server-side payload from _meta
      addFlowLog({
        type: "api_request",
        label: `Authorize Payment (${isImmediateCapture ? "Immediate" : "Deferred"} Mode)`,
        method: "POST",
        endpoint: "/api/afterpay/auth → /v2/payments/auth",
        data: authData._meta?.requestBody || {
          ...authClientRequest,
          paymentScheduleChecksum: paymentScheduleChecksum.substring(0, 20) + "...",
        },
        fullUrl: authData._meta?.fullUrl,
        headers: authData._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: "Authorization Response",
        method: "POST",
        endpoint: "/v2/payments/auth",
        status: authResponse.status,
        data: authData,
        duration: authDuration,
        fullUrl: authData._meta?.fullUrl,
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
        const captureClientRequest = {
          orderId: authData.id,
          amount: finalTotal,
          isCheckoutAdjusted: true,
          paymentScheduleChecksum,
        };

        const captureStartTime = Date.now();
        const captureResponse = await fetch("/api/afterpay/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(captureClientRequest),
        });

        const captureData = await captureResponse.json();
        const captureDuration = Date.now() - captureStartTime;

        // Log request with FULL server-side payload from _meta
        addFlowLog({
          type: "api_request",
          label: "Capture Payment (Immediate Mode)",
          method: "POST",
          endpoint: `/api/afterpay/capture → /v2/payments/${authData.id}/capture`,
          data: captureData._meta?.requestBody || {
            ...captureClientRequest,
            paymentScheduleChecksum: paymentScheduleChecksum.substring(0, 20) + "...",
          },
          fullUrl: captureData._meta?.fullUrl,
          headers: captureData._meta?.headers,
        });

        addFlowLog({
          type: "api_response",
          label: "Capture Response",
          method: "POST",
          endpoint: `/v2/payments/${authData.id}/capture`,
          status: captureResponse.status,
          data: captureData,
          duration: captureDuration,
          fullUrl: captureData._meta?.fullUrl,
        });

        if (captureData.error) {
          throw new Error(captureData.error);
        }
      }

      // Store cart data in sessionStorage before clearing (for confirmation page)
      // Use stored cart data if available, otherwise use cart context
      const storedCartData = sessionStorage.getItem('afterpay_checkout_cart');
      let orderItems = items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      }));
      if (storedCartData && orderItems.length === 0) {
        try {
          const parsed = JSON.parse(storedCartData);
          orderItems = parsed.items || [];
        } catch {
          // Use empty items
        }
      }
      sessionStorage.setItem('afterpay_pending_order', JSON.stringify({
        items: orderItems,
        total: cartTotal + selectedShipping.price,
      }));
      // Clean up the checkout cart data
      sessionStorage.removeItem('afterpay_checkout_cart');

      // Cart will be cleared on confirmation page after order is saved
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
    <div className="min-h-screen pb-72">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress Timeline */}
      <CheckoutProgress currentStep="shipping" showShipping />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Select Shipping Method</h1>
        <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
          Choose your preferred shipping option to complete your order.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white dark:bg-afterpay-gray-800 border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-gray-50 dark:bg-afterpay-gray-700 border-b border-afterpay-gray-200 dark:border-afterpay-gray-600">
          <h2 className="font-semibold dark:text-white">Order Summary</h2>
        </div>
        <div className="p-6">
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded-lg overflow-hidden relative flex-shrink-0">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm dark:text-white">{item.product.name}</p>
                    <p className="text-xs text-afterpay-gray-600 dark:text-afterpay-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-sm dark:text-white">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm">Cart items will be processed from your session.</p>
          )}
        </div>
      </div>

      {/* Shipping Options */}
      <div className="bg-white dark:bg-afterpay-gray-800 border border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-gray-50 dark:bg-afterpay-gray-700 border-b border-afterpay-gray-200 dark:border-afterpay-gray-600">
          <h2 className="font-semibold dark:text-white">Shipping Method</h2>
        </div>
        <div className="p-6 space-y-3">
          {SHIPPING_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedShipping.id === option.id
                  ? "border-afterpay-mint bg-afterpay-mint/10 dark:bg-afterpay-mint/20"
                  : "border-afterpay-gray-200 dark:border-afterpay-gray-600 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-500"
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
                  <span className="font-medium dark:text-white">{option.name}</span>
                  <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">{option.description}</p>
                </div>
              </div>
              <span className="font-medium dark:text-white">{formatPrice(option.price)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Afterpay Payment Schedule Widget */}
      <div className="bg-white dark:bg-afterpay-gray-700 border border-afterpay-gray-200 dark:border-afterpay-gray-600 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-afterpay-mint/20 dark:bg-afterpay-gray-600 border-b border-afterpay-mint dark:border-afterpay-gray-500">
          <div className="flex items-center gap-3">
            <img
              alt="Cash App Afterpay"
              src={isDarkMode
                ? "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg"
                : "https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-black-32.svg"
              }
              height="24"
              className="h-6"
            />
            <span className="font-medium dark:text-white">Payment Schedule</span>
          </div>
        </div>
        <div className="p-6">
          {/* Widget container */}
          <div id="afterpay-widget" className="min-h-[100px]">
            {!widgetReady && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-afterpay-mint border-t-transparent rounded-full mr-3" />
                <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Loading payment schedule...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Total */}
      <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-6 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between text-afterpay-gray-700 dark:text-afterpay-gray-300">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-afterpay-gray-700 dark:text-afterpay-gray-300">
            <span>Shipping</span>
            <span>{formatPrice(selectedShipping.price)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-2 mt-2 dark:text-white">
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
          className="flex-1 py-4 px-6 bg-white dark:bg-afterpay-gray-800 text-afterpay-black dark:text-white text-center font-medium rounded-lg border-2 border-afterpay-gray-300 dark:border-afterpay-gray-600 hover:border-afterpay-gray-400 dark:hover:border-afterpay-gray-500 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* Note */}
      <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 text-center mt-6">
        By clicking &quot;Place Order&quot;, your payment will be authorized and captured through Afterpay.
      </p>
      </div>

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
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Loading shipping options...</p>
        </div>
      }
    >
      <ShippingContent />
    </Suspense>
  );
}
