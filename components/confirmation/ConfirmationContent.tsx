"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useConfig } from "@/components/ConfigProvider";
import { getFlowLogs, FlowLogs } from "@/lib/flowLogs";
import { saveOrder, Order, OrderItem } from "@/lib/orders";
import { getStoredCart, calculateTotal } from "@/lib/cart";
import { captureFullPaymentClient, authorizePaymentClient } from "@/lib/payment-client";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { SDK_POLL_INTERVAL_MS } from "@/lib/constants";
import { FlowLogsSection } from "./FlowLogsSection";
import { OrderSuccessSection } from "./OrderSuccessSection";

export function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const { config } = useConfig();
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    status: string;
    flow: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowLogs, setFlowLogs] = useState<FlowLogs | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const hasProcessed = useRef(false);
  const captureModeRef = useRef(config.captureMode);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => { captureModeRef.current = config.captureMode; }, [config.captureMode]);

  useEffect(() => {
    // Prevent running multiple times
    if (hasProcessed.current) return;

    // Handle Cash App Pay mobile redirect return
    const isCashAppPayReturn = searchParams.get("cashAppPay") === "true";

    if (isCashAppPayReturn) {
      hasProcessed.current = true;

      const initListeners = () => {
        if (typeof window !== "undefined" && window.Afterpay?.initializeCashAppPayListeners) {
          window.Afterpay.initializeCashAppPayListeners({
            onComplete: async (event) => {
              if (event.data.status === "SUCCESS") {
                try {
                  const captureMode = captureModeRef.current;
                  const isImmediateCapture = captureMode === "immediate";

                  const result = isImmediateCapture
                    ? await captureFullPaymentClient(event.data.orderToken)
                    : await authorizePaymentClient(event.data.orderToken);

                  const orderId = result.orderId;
                  const isCaptured = isImmediateCapture;
                  const flow = `cashapp-${captureMode}`;

                  // Save order
                  const pendingOrderData = sessionStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
                  let orderItems: OrderItem[] = [];
                  let orderTotal = 0;
                  if (pendingOrderData) {
                    try {
                      const parsed = JSON.parse(pendingOrderData);
                      orderItems = parsed.items || [];
                      orderTotal = parsed.total || 0;
                      sessionStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
                    } catch { /* fall through */ }
                  }

                  const order: Order = {
                    id: `local-${Date.now()}`,
                    orderId,
                    status: isCaptured ? "captured" : "authorized",
                    total: orderTotal,
                    items: orderItems,
                    createdAt: new Date().toISOString(),
                    flow,
                    captureMode: isCaptured ? "immediate" : "deferred",
                  };
                  saveOrder(order);

                  setOrderDetails({ orderId, status: isCaptured ? "CAPTURED" : "AUTHORIZED", flow });
                  setFlowLogs(getFlowLogs());
                  clearCart();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "An error occurred");
                }
              } else {
                setError("Cash App Pay was cancelled");
                setFlowLogs(getFlowLogs());
              }
            },
          });
        } else {
          timeoutRef.current = setTimeout(initListeners, SDK_POLL_INTERVAL_MS);
        }
      };

      initListeners();
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }

    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const flow = searchParams.get("flow") || "standard";

    // Confirmation page handles both captured and authorized orders
    // The flow parameter indicates the capture mode:
    // - Ends with "-immediate": Payment was captured
    // - Ends with "-deferred": Payment was only authorized (capture from Admin)
    if (orderId && status === "success") {
      hasProcessed.current = true;
      const isCaptured = flow.endsWith("-immediate");

      // Try to get order data from sessionStorage first (set by review page for standard flow)
      // Fall back to localStorage cart for express flow
      let orderItems: OrderItem[] = [];
      let orderTotal = 0;

      const pendingOrderData = sessionStorage.getItem(STORAGE_KEYS.PENDING_ORDER);
      if (pendingOrderData) {
        try {
          const parsed = JSON.parse(pendingOrderData);
          orderItems = parsed.items || [];
          orderTotal = parsed.total || 0;
          sessionStorage.removeItem(STORAGE_KEYS.PENDING_ORDER);
        } catch {
          // Fall back to cart
        }
      }

      // If no pending order data, try cart (for express flow)
      if (orderItems.length === 0) {
        const cartItems = getStoredCart();
        orderItems = cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        }));
        orderTotal = calculateTotal(cartItems);
      }

      const order: Order = {
        id: `local-${Date.now()}`,
        orderId,
        status: isCaptured ? "captured" : "authorized",
        total: orderTotal,
        items: orderItems,
        createdAt: new Date().toISOString(),
        flow,
        captureMode: isCaptured ? "immediate" : "deferred",
      };

      saveOrder(order);

      setOrderDetails({
        orderId,
        status: isCaptured ? "CAPTURED" : "AUTHORIZED",
        flow
      });
      setFlowLogs(getFlowLogs());
      clearCart();
      return;
    }

    // Handle cancelled status
    if (status === "cancelled") {
      hasProcessed.current = true;
      setFlowLogs(getFlowLogs());
      setError("Checkout was cancelled");
    }
  }, [searchParams, clearCart]);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-red-500 dark:text-red-400"
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
          <h1 className="text-2xl font-display font-bold mb-2 dark:text-white">Payment Failed</h1>
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-6">{error}</p>
          <Link
            href="/checkout"
            className="inline-block px-6 py-3 bg-afterpay-black dark:bg-white text-white dark:text-afterpay-black font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-gray-100 transition-colors"
          >
            Try Again
          </Link>
        </div>

        {/* Show flow logs even on error (developer mode only) */}
        {config.developerMode && flowLogs && flowLogs.entries.length > 0 && (
          <div className="mt-8">
            <FlowLogsSection
              flowLogs={flowLogs}
              expandedLogs={expandedLogs}
              toggleLogExpanded={toggleLogExpanded}
            />
          </div>
        )}
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-display font-bold mb-4 dark:text-white">No order found</h1>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-afterpay-black dark:bg-white text-white dark:text-afterpay-black font-medium rounded-lg hover:bg-afterpay-gray-800 dark:hover:bg-afterpay-gray-100 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <OrderSuccessSection
      orderDetails={orderDetails}
      developerMode={config.developerMode}
      flowLogs={flowLogs}
      expandedLogs={expandedLogs}
      toggleLogExpanded={toggleLogExpanded}
    />
  );
}
