"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/products";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";
import { initFlowLogs, addFlowLog } from "@/lib/flowLogs";
import { PaymentDetails } from "@/lib/afterpay";

type ActionType = "capture" | "refund" | "void";

interface ActionModalProps {
  action: ActionType;
  orderId: string;
  maxAmount: number;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  isLoading: boolean;
}

function ActionModal({ action, orderId, maxAmount, onClose, onSubmit, isLoading }: ActionModalProps) {
  const [amount, setAmount] = useState(maxAmount.toString());

  const actionLabels = {
    capture: { title: "Capture Payment", button: "Capture", description: "Capture authorized funds from the customer." },
    refund: { title: "Refund Payment", button: "Refund", description: "Refund captured funds back to the customer." },
    void: { title: "Void Payment", button: "Void", description: "Void authorized funds that haven't been captured." },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(parseFloat(amount));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-2">{actionLabels[action].title}</h2>
        <p className="text-afterpay-gray-600 text-sm mb-4">{actionLabels[action].description}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Order ID</label>
            <input
              type="text"
              value={orderId}
              readOnly
              className="input-styled bg-afterpay-gray-100 font-mono text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-styled"
            />
            <p className="text-xs text-afterpay-gray-500 mt-1">
              Maximum: {formatPrice(maxAmount)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-afterpay-gray-300 rounded-lg hover:bg-afterpay-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                action === "refund" || action === "void"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-afterpay-black hover:bg-afterpay-gray-800"
              }`}
            >
              {isLoading ? "Processing..." : actionLabels[action].button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CaptureMode = "deferred" | "immediate";

interface MerchantConfiguration {
  minimumAmount?: { amount: string; currency: string };
  maximumAmount?: { amount: string; currency: string };
  usingCustomCredentials?: boolean;
}

export default function AdminPage() {
  const [orderId, setOrderId] = useState("");
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("deferred");

  // Custom credentials state
  const [useCustomCredentials, setUseCustomCredentials] = useState(false);
  const [customMerchantId, setCustomMerchantId] = useState("");
  const [customSecretKey, setCustomSecretKey] = useState("");
  const [configuration, setConfiguration] = useState<MerchantConfiguration | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Initialize flow logs and load capture mode setting on mount
  useEffect(() => {
    initFlowLogs("admin");
    // Load capture mode from localStorage
    const savedMode = localStorage.getItem("afterpay_capture_mode") as CaptureMode | null;
    if (savedMode === "deferred" || savedMode === "immediate") {
      setCaptureMode(savedMode);
    }
    // Load default configuration on mount
    fetchConfiguration();
  }, []);

  // Fetch merchant configuration
  const fetchConfiguration = async (merchantId?: string, secretKey?: string) => {
    setIsLoadingConfig(true);
    setConfigError(null);

    try {
      const body = merchantId && secretKey ? { merchantId, secretKey } : {};

      addFlowLog({
        type: "api_request",
        label: "Get Configuration",
        method: "POST",
        endpoint: "/api/afterpay/configuration → /v2/configuration",
        data: merchantId ? { merchantId, secretKey: "***" } : { usingEnvCredentials: true },
      });

      const startTime = Date.now();
      const response = await fetch("/api/afterpay/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_response",
        label: "Configuration Response",
        method: "POST",
        endpoint: "/v2/configuration",
        status: response.status,
        data: data,
        duration,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      setConfiguration(data);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Failed to load configuration");
      setConfiguration(null);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Handle custom credentials toggle
  const handleUseCustomCredentials = (useCustom: boolean) => {
    setUseCustomCredentials(useCustom);
    if (!useCustom) {
      setCustomMerchantId("");
      setCustomSecretKey("");
      setConfigError(null);
      fetchConfiguration(); // Reload with default credentials
    }
  };

  // Validate and fetch config with custom credentials
  const handleValidateCredentials = () => {
    if (!customMerchantId.trim() || !customSecretKey.trim()) {
      setConfigError("Please enter both Merchant ID and Secret Key");
      return;
    }
    fetchConfiguration(customMerchantId.trim(), customSecretKey.trim());
  };

  // Save capture mode to localStorage when it changes
  const handleCaptureModeChange = (mode: CaptureMode) => {
    setCaptureMode(mode);
    localStorage.setItem("afterpay_capture_mode", mode);
  };

  // Lookup payment - silent mode for background refreshes without clearing current data
  const lookupPayment = async (silent = false) => {
    const targetOrderId = silent && payment ? payment.id : orderId.trim();

    if (!targetOrderId) {
      setError("Please enter an order ID");
      return;
    }

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setPayment(null);
    }

    addFlowLog({
      type: "api_request",
      label: silent ? "Refresh Payment" : "Get Payment Details",
      method: "GET",
      endpoint: `/api/afterpay/payment/${targetOrderId} → /v2/payments/${targetOrderId}`,
      data: { orderId: targetOrderId },
    });

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/afterpay/payment/${targetOrderId}`);
      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_response",
        label: "Payment Details",
        method: "GET",
        endpoint: `/v2/payments/${targetOrderId}`,
        status: response.status,
        data: data,
        duration,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      setPayment(data);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to lookup payment");
      }
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleAction = async (action: ActionType, amount: number) => {
    if (!payment) return;

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    const endpoints = {
      capture: "/api/afterpay/capture",
      refund: "/api/afterpay/refund",
      void: "/api/afterpay/void",
    };

    const afterpayEndpoints = {
      capture: `/v2/payments/${payment.id}/capture`,
      refund: `/v2/payments/${payment.id}/refund`,
      void: `/v2/payments/${payment.id}/void`,
    };

    const requestBody = { orderId: payment.id, amount };

    addFlowLog({
      type: "api_request",
      label: `${action.charAt(0).toUpperCase() + action.slice(1)} Payment`,
      method: "POST",
      endpoint: `${endpoints[action]} → ${afterpayEndpoints[action]}`,
      data: requestBody,
    });

    const startTime = Date.now();

    try {
      const response = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_response",
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} Response`,
        method: "POST",
        endpoint: afterpayEndpoints[action],
        status: response.status,
        data: data,
        duration,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccessMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} of ${formatPrice(amount)} successful!`);
      setActiveAction(null);

      // Update payment state from API response
      // The capture/refund/void responses contain updated payment details
      if (data && payment) {
        const amountMoney = { amount: amount.toFixed(2), currency: "USD" };
        const now = new Date().toISOString();

        // Merge API response with current payment data
        // API response may have updated fields like openToCaptureAmount, status, events
        const updatedPayment: PaymentDetails = {
          ...payment,
          // Use API response values if available
          status: data.status || payment.status,
          openToCaptureAmount: data.openToCaptureAmount || payment.openToCaptureAmount,
          paymentState: data.paymentState || payment.paymentState,
          // Merge events - API response may have new events
          events: data.events || payment.events,
          // Merge refunds
          refunds: data.refunds || payment.refunds,
        };

        // If the API response doesn't include updated events, add them optimistically
        if (action === "refund" && !data.refunds?.some((r: { refundId: string }) => r.refundId !== payment.refunds?.find((pr) => pr.refundId === r.refundId))) {
          // Add refund to refunds array if not already present
          const refundExists = updatedPayment.refunds?.some((r) =>
            parseFloat(r.amount.amount) === amount &&
            new Date(r.refundedAt).getTime() > Date.now() - 60000
          );
          if (!refundExists) {
            updatedPayment.refunds = [
              ...(updatedPayment.refunds || []),
              {
                refundId: data.refundId || `temp-${Date.now()}`,
                refundedAt: now,
                amount: amountMoney,
              },
            ];
          }
        } else if (action === "capture") {
          // Check if capture event exists in response
          const captureEventExists = updatedPayment.events?.some((e) =>
            (e.type === "CAPTURED" || e.type === "CAPTURE" || e.type === "CAPTURE_APPROVED") &&
            parseFloat(e.amount.amount) === amount
          );
          if (!captureEventExists) {
            updatedPayment.events = [
              ...(updatedPayment.events || []),
              {
                id: `temp-${Date.now()}`,
                created: now,
                type: "CAPTURED",
                amount: amountMoney,
              },
            ];
          }
          // Update openToCaptureAmount if not already updated
          if (updatedPayment.openToCaptureAmount.amount === payment.openToCaptureAmount.amount) {
            const newOpenToCapture = Math.max(0, parseFloat(payment.openToCaptureAmount.amount) - amount);
            updatedPayment.openToCaptureAmount = { amount: newOpenToCapture.toFixed(2), currency: "USD" };
          }
        } else if (action === "void") {
          // Check if void event exists in response
          const voidEventExists = updatedPayment.events?.some((e) =>
            (e.type === "VOID" || e.type === "VOIDED") &&
            parseFloat(e.amount.amount) === amount
          );
          if (!voidEventExists) {
            updatedPayment.events = [
              ...(updatedPayment.events || []),
              {
                id: `temp-${Date.now()}`,
                created: now,
                type: "VOID",
                amount: amountMoney,
              },
            ];
          }
          // Update openToCaptureAmount if not already updated
          if (updatedPayment.openToCaptureAmount.amount === payment.openToCaptureAmount.amount) {
            const newOpenToCapture = Math.max(0, parseFloat(payment.openToCaptureAmount.amount) - amount);
            updatedPayment.openToCaptureAmount = { amount: newOpenToCapture.toFixed(2), currency: "USD" };
          }
        }

        setPayment(updatedPayment);
      }

      // Silently refresh to sync with server after a short delay
      // This ensures we have the most up-to-date data from the API
      setTimeout(() => {
        lookupPayment(true);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  const getOpenToCapture = () => {
    if (!payment?.openToCaptureAmount) return 0;
    return parseFloat(payment.openToCaptureAmount.amount);
  };

  const getOriginalAmount = () => {
    if (!payment?.originalAmount) return 0;
    return parseFloat(payment.originalAmount.amount);
  };

  const getCapturedAmount = () => {
    if (!payment) return 0;

    // First try to calculate from events
    if (payment.events) {
      // Handle different event type naming conventions from Afterpay API
      const capturedFromEvents = payment.events
        .filter((e) => e.type === "CAPTURED" || e.type === "CAPTURE" || e.type === "CAPTURE_APPROVED")
        .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);

      if (capturedFromEvents > 0) return capturedFromEvents;
    }

    // Fallback: Calculate from original amount minus open to capture
    // This is useful when events aren't populated but openToCaptureAmount is updated
    const original = parseFloat(payment.originalAmount?.amount || "0");
    const openToCapture = parseFloat(payment.openToCaptureAmount?.amount || "0");
    const voided = payment.events
      ?.filter((e) => e.type === "VOID" || e.type === "VOIDED")
      .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0) || 0;

    // captured = original - openToCapture - voided
    return Math.max(0, original - openToCapture - voided);
  };

  const getRefundedAmount = () => {
    let total = 0;

    // Check events for REFUND type - handle different naming conventions
    if (payment?.events) {
      total += payment.events
        .filter((e) => e.type === "REFUND" || e.type === "REFUNDED" || e.type === "REFUND_APPROVED")
        .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);
    }

    // Also check the refunds array (some API responses use this instead)
    if (payment?.refunds && Array.isArray(payment.refunds)) {
      total += payment.refunds.reduce((sum, r) => sum + parseFloat(r.amount.amount), 0);
    }

    return total;
  };

  const getVoidedAmount = () => {
    if (!payment?.events) return 0;
    // Handle different event type naming conventions from Afterpay API
    return payment.events
      .filter((e) => e.type === "VOID" || e.type === "VOIDED" || e.type === "VOID_APPROVED")
      .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);
  };

  // Round to 2 decimal places to avoid floating point precision issues
  const roundAmount = (amount: number) => Math.round(amount * 100) / 100;

  const getAvailableToRefund = () => roundAmount(getCapturedAmount() - getRefundedAmount());

  const canCapture = () => getOpenToCapture() > 0;
  const canRefund = () => getAvailableToRefund() > 0;
  const canVoid = () => getOpenToCapture() > 0;

  // Compute effective payment status based on actual amounts
  const getEffectiveStatus = () => {
    const captured = getCapturedAmount();
    const refunded = getRefundedAmount();
    const voided = getVoidedAmount();
    const original = getOriginalAmount();
    const openToCapture = getOpenToCapture();

    // Check refund status first
    if (refunded > 0) {
      if (refunded >= captured) {
        return { label: "FULLY REFUNDED", color: "bg-orange-100 text-orange-800" };
      }
      return { label: "PARTIALLY REFUNDED", color: "bg-orange-100 text-orange-800" };
    }

    // Check void status
    if (voided > 0) {
      if (voided >= original) {
        return { label: "VOIDED", color: "bg-red-100 text-red-800" };
      }
      return { label: "PARTIALLY VOIDED", color: "bg-red-100 text-red-800" };
    }

    // Check capture status
    if (captured > 0) {
      if (openToCapture <= 0) {
        return { label: "CAPTURED", color: "bg-green-100 text-green-800" };
      }
      return { label: "PARTIALLY CAPTURED", color: "bg-blue-100 text-blue-800" };
    }

    // Check authorization status
    if (payment?.status === "APPROVED") {
      return { label: "AUTHORIZED", color: "bg-blue-100 text-blue-800" };
    }

    // Fall back to API status
    return {
      label: payment?.status || "UNKNOWN",
      color: payment?.status === "DECLINED" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
    };
  };

  return (
    <div className="min-h-screen bg-afterpay-gray-50 pb-72">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-afterpay-gray-600 hover:text-afterpay-black"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold">Payment Admin</h1>
          </div>
          <p className="text-afterpay-gray-600">
            Manage Afterpay payments - capture, refund, or void orders.
          </p>
        </div>

        {/* Capture Mode Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Capture Mode</h2>
              <p className="text-sm text-afterpay-gray-600 mt-1">
                {captureMode === "deferred"
                  ? "Authorization only on checkout. Capture payments manually from this panel."
                  : "Automatically capture full payment when checkout completes."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCaptureModeChange("deferred")}
                className={`px-4 py-2 rounded-l-lg border font-medium text-sm transition-colors ${
                  captureMode === "deferred"
                    ? "bg-afterpay-black text-white border-afterpay-black"
                    : "bg-white text-afterpay-gray-600 border-afterpay-gray-300 hover:bg-afterpay-gray-50"
                }`}
              >
                Deferred
              </button>
              <button
                onClick={() => handleCaptureModeChange("immediate")}
                className={`px-4 py-2 rounded-r-lg border-t border-r border-b font-medium text-sm transition-colors ${
                  captureMode === "immediate"
                    ? "bg-afterpay-black text-white border-afterpay-black"
                    : "bg-white text-afterpay-gray-600 border-afterpay-gray-300 hover:bg-afterpay-gray-50"
                }`}
              >
                Immediate
              </button>
            </div>
          </div>
        </div>

        {/* API Credentials & Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">API Credentials</h2>
              <p className="text-sm text-afterpay-gray-600 mt-1">
                {useCustomCredentials
                  ? "Using custom sandbox credentials"
                  : "Using default environment credentials"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUseCustomCredentials(false)}
                className={`px-4 py-2 rounded-l-lg border font-medium text-sm transition-colors ${
                  !useCustomCredentials
                    ? "bg-afterpay-black text-white border-afterpay-black"
                    : "bg-white text-afterpay-gray-600 border-afterpay-gray-300 hover:bg-afterpay-gray-50"
                }`}
              >
                Default
              </button>
              <button
                onClick={() => handleUseCustomCredentials(true)}
                className={`px-4 py-2 rounded-r-lg border-t border-r border-b font-medium text-sm transition-colors ${
                  useCustomCredentials
                    ? "bg-afterpay-black text-white border-afterpay-black"
                    : "bg-white text-afterpay-gray-600 border-afterpay-gray-300 hover:bg-afterpay-gray-50"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom Credentials Input */}
          {useCustomCredentials && (
            <div className="border-t border-afterpay-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Merchant ID</label>
                  <input
                    type="text"
                    value={customMerchantId}
                    onChange={(e) => setCustomMerchantId(e.target.value)}
                    placeholder="Enter your Merchant ID"
                    className="input-styled font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secret Key</label>
                  <input
                    type="password"
                    value={customSecretKey}
                    onChange={(e) => setCustomSecretKey(e.target.value)}
                    placeholder="Enter your Secret Key"
                    className="input-styled font-mono text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleValidateCredentials}
                disabled={isLoadingConfig || !customMerchantId || !customSecretKey}
                className="px-4 py-2 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50"
              >
                {isLoadingConfig ? "Validating..." : "Validate Credentials"}
              </button>
            </div>
          )}

          {/* Configuration Error */}
          {configError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
              {configError}
            </div>
          )}

          {/* Configuration Display */}
          {configuration && !configError && (
            <div className="border-t border-afterpay-gray-200 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium">Merchant Configuration</h3>
                {isLoadingConfig && (
                  <div className="animate-spin w-4 h-4 border-2 border-afterpay-mint border-t-transparent rounded-full" />
                )}
                {configuration.usingCustomCredentials && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-afterpay-gray-50 rounded-lg p-4">
                  <dt className="text-sm text-afterpay-gray-600 mb-1">Minimum Order</dt>
                  <dd className="text-xl font-semibold">
                    {configuration.minimumAmount
                      ? `${configuration.minimumAmount.currency} ${parseFloat(configuration.minimumAmount.amount).toFixed(2)}`
                      : "Not set"}
                  </dd>
                </div>
                <div className="bg-afterpay-gray-50 rounded-lg p-4">
                  <dt className="text-sm text-afterpay-gray-600 mb-1">Maximum Order</dt>
                  <dd className="text-xl font-semibold">
                    {configuration.maximumAmount
                      ? `${configuration.maximumAmount.currency} ${parseFloat(configuration.maximumAmount.amount).toFixed(2)}`
                      : "Not set"}
                  </dd>
                </div>
              </div>
              <p className="text-xs text-afterpay-gray-500 mt-3">
                Orders outside this range will not be eligible for Afterpay checkout.
              </p>
            </div>
          )}
        </div>

        {/* Lookup Section */}
        <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Lookup Payment</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter Order ID (e.g., 400296372065)"
              className="flex-1 input-styled font-mono"
              onKeyDown={(e) => e.key === "Enter" && lookupPayment()}
            />
            <button
              onClick={() => lookupPayment()}
              disabled={isLoading}
              className="px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Lookup"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* Payment Details */}
        {payment && (
          <div className="space-y-6">
            {/* Payment Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-blue-50 border-b border-afterpay-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Payment Details</h2>
                    {isRefreshing && (
                      <span className="text-xs text-afterpay-gray-500 flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-afterpay-mint border-t-transparent rounded-full animate-spin" />
                        Syncing...
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEffectiveStatus().color}`}>
                    {getEffectiveStatus().label}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-afterpay-gray-500">Order ID</dt>
                    <dd className="font-mono text-sm">{payment.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-afterpay-gray-500">Created</dt>
                    <dd className="text-sm">{new Date(payment.created).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-afterpay-gray-500">Original Amount</dt>
                    <dd className="text-lg font-semibold">{formatPrice(getOriginalAmount())}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-afterpay-gray-500">Open to Capture</dt>
                    <dd className="text-lg font-semibold text-blue-600">{formatPrice(getOpenToCapture())}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-afterpay-mint/10 border-b border-afterpay-gray-200">
                <h2 className="text-lg font-semibold">Amount Breakdown</h2>
              </div>
              <div className="p-6">
                {/* Visual Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-afterpay-gray-600">Payment Progress</span>
                    <span className="font-medium">{formatPrice(getOriginalAmount())}</span>
                  </div>
                  <div className="h-4 bg-afterpay-gray-100 rounded-full overflow-hidden flex">
                    {/* Captured portion */}
                    {getCapturedAmount() > 0 && (
                      <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${(getCapturedAmount() / getOriginalAmount()) * 100}%` }}
                        title={`Captured: ${formatPrice(getCapturedAmount())}`}
                      />
                    )}
                    {/* Open to capture portion */}
                    {getOpenToCapture() > 0 && (
                      <div
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${(getOpenToCapture() / getOriginalAmount()) * 100}%` }}
                        title={`Open to Capture: ${formatPrice(getOpenToCapture())}`}
                      />
                    )}
                    {/* Refunded portion */}
                    {getRefundedAmount() > 0 && (
                      <div
                        className="bg-orange-500 h-full transition-all duration-500"
                        style={{ width: `${(getRefundedAmount() / getOriginalAmount()) * 100}%` }}
                        title={`Refunded: ${formatPrice(getRefundedAmount())}`}
                      />
                    )}
                    {/* Voided portion */}
                    {getVoidedAmount() > 0 && (
                      <div
                        className="bg-red-500 h-full transition-all duration-500"
                        style={{ width: `${(getVoidedAmount() / getOriginalAmount()) * 100}%` }}
                        title={`Voided: ${formatPrice(getVoidedAmount())}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Captured</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>Open to Capture</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>Refunded</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span>Voided</span>
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="space-y-3 pt-4 border-t border-afterpay-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-afterpay-gray-600">Original Amount</span>
                    <span className="font-medium">{formatPrice(getOriginalAmount())}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>Captured</span>
                    <span className="font-medium">{formatPrice(getCapturedAmount())}</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-600">
                    <span>Refunded</span>
                    <span className="font-medium">-{formatPrice(getRefundedAmount())}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span>Voided</span>
                    <span className="font-medium">-{formatPrice(getVoidedAmount())}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-afterpay-gray-200">
                    <span className="font-medium">Open to Capture</span>
                    <span className="font-bold text-blue-600">{formatPrice(getOpenToCapture())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Available to Refund</span>
                    <span className="font-bold text-orange-600">{formatPrice(getAvailableToRefund())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-afterpay-mint/10 border-b border-afterpay-gray-200">
                <h2 className="text-lg font-semibold">Actions</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveAction("capture")}
                    disabled={!canCapture()}
                    className="px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Capture Payment
                  </button>
                  <button
                    onClick={() => setActiveAction("refund")}
                    disabled={!canRefund()}
                    className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Refund Payment
                  </button>
                  <button
                    onClick={() => setActiveAction("void")}
                    disabled={!canVoid()}
                    className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Void Payment
                  </button>
                </div>
                <div className="mt-4 text-sm text-afterpay-gray-500">
                  <p><strong>Capture:</strong> Collect authorized funds (available for 13 days after authorization)</p>
                  <p><strong>Refund:</strong> Return captured funds to the customer</p>
                  <p><strong>Void:</strong> Cancel uncaptured authorized funds</p>
                </div>
              </div>
            </div>

            {/* Event History */}
            {((payment.events && payment.events.length > 0) || (payment.refunds && payment.refunds.length > 0)) && (
              <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-purple-50 border-b border-afterpay-gray-200">
                  <h2 className="text-lg font-semibold">Event History</h2>
                </div>
                <div className="divide-y divide-afterpay-gray-200">
                  {/* Combine events and refunds into a unified timeline */}
                  {[
                    ...(payment.events || []).map((event) => ({
                      id: `event-${event.id}`,
                      type: event.type,
                      created: event.created,
                      amount: event.amount,
                    })),
                    ...(payment.refunds || []).map((refund) => ({
                      id: `refund-${refund.refundId}`,
                      type: "REFUND",
                      created: refund.refundedAt,
                      amount: refund.amount,
                    })),
                  ]
                    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
                    .map((item) => (
                      <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                            item.type === "AUTH_APPROVED" || item.type === "AUTH" || item.type === "AUTH_PENDING" ? "bg-blue-100 text-blue-800" :
                            item.type === "CAPTURED" || item.type === "CAPTURE" || item.type === "CAPTURE_APPROVED" ? "bg-green-100 text-green-800" :
                            item.type === "REFUND" || item.type === "REFUNDED" || item.type === "REFUND_APPROVED" ? "bg-orange-100 text-orange-800" :
                            item.type === "VOID" || item.type === "VOIDED" || item.type === "VOID_APPROVED" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-sm text-afterpay-gray-500">
                            {new Date(item.created).toLocaleString()}
                          </span>
                        </div>
                        <span className="font-medium">{formatPrice(parseFloat(item.amount.amount))}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!payment && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-afterpay-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-afterpay-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-afterpay-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No Payment Selected</h3>
            <p className="text-afterpay-gray-600">
              Enter an order ID above to view payment details and perform actions.
            </p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {activeAction && payment && (
        <ActionModal
          action={activeAction}
          orderId={payment.id}
          maxAmount={
            activeAction === "capture" ? getOpenToCapture() :
            activeAction === "refund" ? getAvailableToRefund() :
            getOpenToCapture()
          }
          onClose={() => setActiveAction(null)}
          onSubmit={(amount) => handleAction(activeAction, amount)}
          isLoading={actionLoading}
        />
      )}

      {/* Developer Panel */}
      <FlowLogsDevPanel />
    </div>
  );
}
