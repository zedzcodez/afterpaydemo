"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/products";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";
import { initFlowLogs, addFlowLog } from "@/lib/flowLogs";
import { PaymentDetails } from "@/lib/afterpay";
import { useConfig } from "@/components/ConfigProvider";

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
      <div className="bg-white dark:bg-afterpay-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-display font-bold mb-2">{actionLabels[action].title}</h2>
        <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm mb-4">{actionLabels[action].description}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-white">Order ID</label>
            <input
              type="text"
              value={orderId}
              readOnly
              className="input-styled bg-afterpay-gray-100 font-mono text-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 dark:text-white">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-styled"
            />
            <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 mt-1">
              Maximum: {formatPrice(maxAmount)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-afterpay-gray-300 dark:border-afterpay-gray-600 rounded-lg hover:bg-afterpay-gray-50 dark:hover:bg-afterpay-gray-700"
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

interface MerchantConfiguration {
  minimumAmount?: { amount: string; currency: string };
  maximumAmount?: { amount: string; currency: string };
}

/* ------------------------------------------------------------------ */
/*  Reusable UI pieces for the Configuration tab                      */
/* ------------------------------------------------------------------ */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h3 className="font-display font-bold text-xs uppercase tracking-widest text-afterpay-gray-500 dark:text-afterpay-gray-400">{title}</h3>
      <div className="mt-2 h-px bg-afterpay-gray-200 dark:bg-afterpay-gray-700" />
    </div>
  );
}

function PillToggle({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
        isOn
          ? "bg-afterpay-mint text-black"
          : "border border-afterpay-gray-300 text-afterpay-gray-500 dark:border-afterpay-gray-600 dark:text-afterpay-gray-400"
      }`}
    >
      {isOn ? "ON" : "OFF"}
    </button>
  );
}

function RadioCard({
  isSelected,
  onClick,
  label,
  description,
  disabled,
}: {
  isSelected: boolean;
  onClick: () => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`p-4 rounded-xl border-2 transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed border-afterpay-gray-200 dark:border-afterpay-gray-700"
          : isSelected
            ? "border-l-4 border-l-afterpay-mint border-afterpay-gray-200 dark:border-afterpay-gray-600 bg-afterpay-mint/5 cursor-pointer"
            : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? "border-afterpay-mint"
              : "border-afterpay-gray-300 dark:border-afterpay-gray-600"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-afterpay-mint" />}
        </div>
        <div>
          <p className={`font-semibold text-sm ${disabled ? "text-afterpay-gray-400 dark:text-afterpay-gray-500" : "dark:text-white"}`}>{label}</p>
          <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ConfigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 p-6 mb-6">
      <h3 className="text-lg font-display font-semibold dark:text-white mb-1">{title}</h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AdminContent component                                       */
/* ------------------------------------------------------------------ */

function AdminContent() {
  const searchParams = useSearchParams();
  const urlOrderId = searchParams.get("orderId");
  const { config, updateConfig } = useConfig();

  // Tab state
  const [activeTab, setActiveTab] = useState<"configuration" | "operations">("configuration");

  // Payment operations state
  const [orderId, setOrderId] = useState(urlOrderId || "");
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  // Merchant configuration state (for Configuration tab)
  const [configuration, setConfiguration] = useState<MerchantConfiguration | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Webhook demo state - temporarily disabled
  // const [webhookEvents, setWebhookEvents] = useState<StoredWebhookEvent[]>([]);
  // const [testingWebhook, setTestingWebhook] = useState(false);
  // const [webhookExpanded, setWebhookExpanded] = useState(false);

  // Initialize flow logs on mount + load merchant config
  useEffect(() => {
    initFlowLogs("admin");
    fetchConfiguration();
  }, []);

  // Auto-lookup payment if orderId is provided in URL params
  useEffect(() => {
    if (urlOrderId && !hasAutoLoaded) {
      setHasAutoLoaded(true);
      // Switch to operations tab when auto-loading
      setActiveTab("operations");
      const autoLookup = async () => {
        setIsLoading(true);
        setError(null);

        const startTime = Date.now();

        try {
          const response = await fetch(`/api/afterpay/payment/${urlOrderId}`);
          const data = await response.json();
          const duration = Date.now() - startTime;

          addFlowLog({
            type: "api_request",
            label: "Get Payment Details (Auto)",
            method: "GET",
            endpoint: `/api/afterpay/payment/${urlOrderId} → /v2/payments/${urlOrderId}`,
            data: { orderId: urlOrderId },
            fullUrl: data._meta?.fullUrl,
            headers: data._meta?.headers,
          });

          addFlowLog({
            type: "api_response",
            label: "Payment Details",
            method: "GET",
            endpoint: `/v2/payments/${urlOrderId}`,
            status: response.status,
            data: data,
            duration,
            fullUrl: data._meta?.fullUrl,
          });

          if (data.error) {
            throw new Error(data.error);
          }

          setPayment(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to lookup payment");
        } finally {
          setIsLoading(false);
        }
      };

      autoLookup();
    }
  }, [urlOrderId, hasAutoLoaded]);

  // Fetch merchant configuration (uses environment credentials only)
  const fetchConfiguration = async () => {
    setIsLoadingConfig(true);
    setConfigError(null);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/afterpay/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_request",
        label: "Get Configuration",
        method: "POST",
        endpoint: "/api/afterpay/configuration → /v2/configuration",
        data: { usingEnvCredentials: true },
        fullUrl: data._meta?.fullUrl,
        headers: data._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: "Configuration Response",
        method: "POST",
        endpoint: "/v2/configuration",
        status: response.status,
        data: data,
        duration,
        fullUrl: data._meta?.fullUrl,
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

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/afterpay/payment/${targetOrderId}`);
      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_request",
        label: silent ? "Refresh Payment" : "Get Payment Details",
        method: "GET",
        endpoint: `/api/afterpay/payment/${targetOrderId} → /v2/payments/${targetOrderId}`,
        data: { orderId: targetOrderId },
        fullUrl: data._meta?.fullUrl,
        headers: data._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: "Payment Details",
        method: "GET",
        endpoint: `/v2/payments/${targetOrderId}`,
        status: response.status,
        data: data,
        duration,
        fullUrl: data._meta?.fullUrl,
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

    const clientRequestBody = { orderId: payment.id, amount };

    const startTime = Date.now();

    try {
      const response = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientRequestBody),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      addFlowLog({
        type: "api_request",
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} Payment`,
        method: "POST",
        endpoint: `${endpoints[action]} → ${afterpayEndpoints[action]}`,
        data: data._meta?.requestBody || clientRequestBody,
        fullUrl: data._meta?.fullUrl,
        headers: data._meta?.headers,
      });

      addFlowLog({
        type: "api_response",
        label: `${action.charAt(0).toUpperCase() + action.slice(1)} Response`,
        method: "POST",
        endpoint: afterpayEndpoints[action],
        status: response.status,
        data: data,
        duration,
        fullUrl: data._meta?.fullUrl,
      });

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccessMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} of ${formatPrice(amount)} successful!`);
      setActiveAction(null);

      // Update payment state from API response
      if (data && payment) {
        const amountMoney = { amount: amount.toFixed(2), currency: "USD" };
        const now = new Date().toISOString();

        const updatedPayment: PaymentDetails = {
          ...payment,
          status: data.status || payment.status,
          openToCaptureAmount: data.openToCaptureAmount || payment.openToCaptureAmount,
          paymentState: data.paymentState || payment.paymentState,
          events: data.events || payment.events,
          refunds: data.refunds || payment.refunds,
        };

        if (action === "refund" && !data.refunds?.some((r: { refundId: string }) => !payment.refunds?.some((pr) => pr.refundId === r.refundId))) {
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
          if (updatedPayment.openToCaptureAmount.amount === payment.openToCaptureAmount.amount) {
            const newOpenToCapture = Math.max(0, parseFloat(payment.openToCaptureAmount.amount) - amount);
            updatedPayment.openToCaptureAmount = { amount: newOpenToCapture.toFixed(2), currency: "USD" };
          }
        } else if (action === "void") {
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
          if (updatedPayment.openToCaptureAmount.amount === payment.openToCaptureAmount.amount) {
            const newOpenToCapture = Math.max(0, parseFloat(payment.openToCaptureAmount.amount) - amount);
            updatedPayment.openToCaptureAmount = { amount: newOpenToCapture.toFixed(2), currency: "USD" };
          }
        }

        setPayment(updatedPayment);
      }

      // Silently refresh to sync with server after a short delay
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

    if (payment.events) {
      const capturedFromEvents = payment.events
        .filter((e) => e.type === "CAPTURED" || e.type === "CAPTURE" || e.type === "CAPTURE_APPROVED")
        .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);

      if (capturedFromEvents > 0) return capturedFromEvents;
    }

    const original = parseFloat(payment.originalAmount?.amount || "0");
    const openToCapture = parseFloat(payment.openToCaptureAmount?.amount || "0");
    const voided = payment.events
      ?.filter((e) => e.type === "VOID" || e.type === "VOIDED")
      .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0) || 0;

    return Math.max(0, original - openToCapture - voided);
  };

  const getRefundedAmount = () => {
    let total = 0;

    if (payment?.events) {
      total += payment.events
        .filter((e) => e.type === "REFUND" || e.type === "REFUNDED" || e.type === "REFUND_APPROVED")
        .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);
    }

    if (payment?.refunds && Array.isArray(payment.refunds)) {
      const eventIds = new Set(payment.events?.map((e) => e.id) || []);
      total += payment.refunds
        .filter((r) => !eventIds.has(r.refundId))
        .reduce((sum, r) => sum + parseFloat(r.amount.amount), 0);
    }

    return total;
  };

  const getVoidedAmount = () => {
    if (!payment?.events) return 0;
    return payment.events
      .filter((e) => e.type === "VOID" || e.type === "VOIDED" || e.type === "VOID_APPROVED")
      .reduce((sum, e) => sum + parseFloat(e.amount.amount), 0);
  };

  const roundAmount = (amount: number) => Math.round(amount * 100) / 100;

  const getAvailableToRefund = () => roundAmount(getCapturedAmount() - getRefundedAmount());

  const canCapture = () => getOpenToCapture() > 0;
  const canRefund = () => getAvailableToRefund() > 0;
  const canVoid = () => getOpenToCapture() > 0;

  const getEffectiveStatus = () => {
    const captured = getCapturedAmount();
    const refunded = getRefundedAmount();
    const voided = getVoidedAmount();
    const original = getOriginalAmount();
    const openToCapture = getOpenToCapture();

    if (refunded > 0) {
      if (refunded >= captured) {
        return { label: "FULLY REFUNDED", color: "bg-orange-100 text-orange-800" };
      }
      return { label: "PARTIALLY REFUNDED", color: "bg-orange-100 text-orange-800" };
    }

    if (voided > 0) {
      if (voided >= original) {
        return { label: "VOIDED", color: "bg-red-100 text-red-800" };
      }
      return { label: "PARTIALLY VOIDED", color: "bg-red-100 text-red-800" };
    }

    if (captured > 0) {
      if (openToCapture <= 0) {
        return { label: "CAPTURED", color: "bg-green-100 text-green-800" };
      }
      return { label: "PARTIALLY CAPTURED", color: "bg-blue-100 text-blue-800" };
    }

    if (payment?.status === "APPROVED") {
      return { label: "AUTHORIZED", color: "bg-blue-100 text-blue-800" };
    }

    return {
      label: payment?.status || "UNKNOWN",
      color: payment?.status === "DECLINED" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
    };
  };

  // Webhook handler functions - temporarily disabled
  /*
  const handleTestWebhook = async (eventType: WebhookEventType = 'PAYMENT_CAPTURED') => { ... };
  const handleClearWebhooks = () => { setWebhookEvents([]); };
  */

  /* ---------------------------------------------------------------- */
  /*  Configuration Tab                                                */
  /* ---------------------------------------------------------------- */

  const renderConfigurationTab = () => (
    <div className="space-y-2">
      {/* CHECKOUT METHODS */}
      <SectionHeader title="Checkout Methods" />

      {/* Express Checkout */}
      <ConfigCard title="Express Checkout">
        <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          Launches via Buy Now buttons on Product, Cart, and Mini-cart. Customers complete payment in a popup.
        </p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium dark:text-white">Enable Express Checkout</span>
          <PillToggle
            isOn={config.expressCheckout.enabled}
            onToggle={() => updateConfig({ expressCheckout: { enabled: !config.expressCheckout.enabled } })}
          />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-afterpay-gray-600 dark:text-afterpay-gray-400">Shipping Type</p>
          <RadioCard
            isSelected={config.expressCheckout.type === "integrated"}
            onClick={() => updateConfig({ expressCheckout: { type: "integrated" } })}
            label="Integrated"
            description="Shipping options shown inside the Afterpay popup"
            disabled={!config.expressCheckout.enabled}
          />
          <RadioCard
            isSelected={config.expressCheckout.type === "deferred"}
            onClick={() => updateConfig({ expressCheckout: { type: "deferred" } })}
            label="Deferred"
            description="Shipping options shown on your site after popup closes"
            disabled={!config.expressCheckout.enabled}
          />
        </div>
      </ConfigCard>

      {/* Standard Checkout */}
      <ConfigCard title="Standard Checkout">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-afterpay-gray-100 text-afterpay-gray-500 dark:bg-afterpay-gray-700 dark:text-afterpay-gray-400">
            Always On
          </span>
        </div>
        <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          The full checkout form at /checkout. Customers enter contact and shipping details before payment.
        </p>
        <div className="space-y-3">
          <p className="text-sm font-medium text-afterpay-gray-600 dark:text-afterpay-gray-400">Method</p>
          <RadioCard
            isSelected={config.standardCheckout.method === "popup"}
            onClick={() => updateConfig({ standardCheckout: { method: "popup" } })}
            label="Popup"
            description="Payment completes in an Afterpay popup window"
          />
          <RadioCard
            isSelected={config.standardCheckout.method === "redirect"}
            onClick={() => updateConfig({ standardCheckout: { method: "redirect" } })}
            label="Redirect"
            description="Customer is redirected to Afterpay's website"
          />
        </div>
      </ConfigCard>

      {/* Cash App Pay */}
      <ConfigCard title="Cash App Pay">
        <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          Available as a tab on the /checkout page. Desktop shows QR code, mobile redirects to Cash App.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium dark:text-white">Enable Cash App Pay</span>
          <PillToggle
            isOn={config.cashAppPay.enabled}
            onToggle={() => updateConfig({ cashAppPay: { enabled: !config.cashAppPay.enabled } })}
          />
        </div>
      </ConfigCard>

      {/* PAYMENT SETTINGS */}
      <SectionHeader title="Payment Settings" />

      {/* Capture Mode */}
      <ConfigCard title="Capture Mode">
        <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          Controls how payments are captured after authorization.
        </p>
        <div className="space-y-3">
          <RadioCard
            isSelected={config.captureMode === "deferred"}
            onClick={() => updateConfig({ captureMode: "deferred" })}
            label="Deferred"
            description="Auth only, capture from Admin panel"
          />
          <RadioCard
            isSelected={config.captureMode === "immediate"}
            onClick={() => updateConfig({ captureMode: "immediate" })}
            label="Immediate"
            description="Auth + capture in one step"
          />
        </div>
      </ConfigCard>

      {/* DISPLAY */}
      <SectionHeader title="Display" />

      {/* Developer Mode */}
      <ConfigCard title="Developer Mode">
        <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-4">
          Show code snippets, API flow logs, integration examples, and the Developer Panel across all pages. Turn off for a clean shopping experience.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium dark:text-white">Enable Developer Mode</span>
          <PillToggle
            isOn={config.developerMode}
            onToggle={() => updateConfig({ developerMode: !config.developerMode })}
          />
        </div>
      </ConfigCard>

      {/* MERCHANT INFO */}
      <SectionHeader title="Merchant Info" />

      {/* Merchant Configuration */}
      <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-semibold dark:text-white">Merchant Configuration</h3>
            <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mt-1">
              Using environment credentials
            </p>
          </div>
          {isLoadingConfig && (
            <div className="animate-spin w-5 h-5 border-2 border-afterpay-mint border-t-transparent rounded-full" />
          )}
        </div>

        {configError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {configError}
          </div>
        )}

        {configuration && !configError && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-900 rounded-lg p-4">
                <dt className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-1">Minimum Order</dt>
                <dd className="text-xl font-semibold dark:text-white">
                  {configuration.minimumAmount
                    ? `${configuration.minimumAmount.currency} ${parseFloat(configuration.minimumAmount.amount).toFixed(2)}`
                    : "Not set"}
                </dd>
              </div>
              <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-900 rounded-lg p-4">
                <dt className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400 mb-1">Maximum Order</dt>
                <dd className="text-xl font-semibold dark:text-white">
                  {configuration.maximumAmount
                    ? `${configuration.maximumAmount.currency} ${parseFloat(configuration.maximumAmount.amount).toFixed(2)}`
                    : "Not set"}
                </dd>
              </div>
            </div>
            <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 mt-3">
              Orders outside this range will not be eligible for Afterpay checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Payment Operations Tab                                           */
  /* ---------------------------------------------------------------- */

  const renderOperationsTab = () => (
    <div>
      {/* Webhook Demo Section - Temporarily Unavailable */}
      <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 mb-6 overflow-hidden opacity-60">
        <div className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-afterpay-gray-50 to-purple-50 dark:from-afterpay-gray-700 dark:to-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold dark:text-white">Webhook Handler Demo</h2>
              <p className="text-sm text-afterpay-gray-600 dark:text-afterpay-gray-400">
                Simulate async payment notifications from Afterpay
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-afterpay-gray-200 dark:bg-afterpay-gray-600 text-afterpay-gray-600 dark:text-afterpay-gray-300 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Lookup Section */}
      <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 p-6 mb-6">
        <h2 className="text-lg font-display font-semibold mb-4 dark:text-white">Lookup Payment</h2>
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

      {/* Payment Details */}
      {payment && (
        <div className="space-y-6">
          {/* Payment Overview */}
          <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-blue-50 dark:from-afterpay-gray-700 dark:to-blue-900/30 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold dark:text-white">Payment Details</h2>
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
                  <dt className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">Order ID</dt>
                  <dd className="font-mono text-sm dark:text-white">{payment.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">Created</dt>
                  <dd className="text-sm dark:text-white">{new Date(payment.created).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">Original Amount</dt>
                  <dd className="text-lg font-semibold dark:text-white">{formatPrice(getOriginalAmount())}</dd>
                </div>
                <div>
                  <dt className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">Open to Capture</dt>
                  <dd className="text-lg font-semibold text-blue-600 dark:text-blue-400">{formatPrice(getOpenToCapture())}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-afterpay-mint/10 dark:from-afterpay-gray-700 dark:to-afterpay-mint/20 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Amount Breakdown</h2>
            </div>
            <div className="p-6">
              {/* Visual Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Payment Progress</span>
                  <span className="font-medium dark:text-white">{formatPrice(getOriginalAmount())}</span>
                </div>
                <div className="h-4 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded-full overflow-hidden flex">
                  {getCapturedAmount() > 0 && (
                    <div
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{ width: `${(getCapturedAmount() / getOriginalAmount()) * 100}%` }}
                      title={`Captured: ${formatPrice(getCapturedAmount())}`}
                    />
                  )}
                  {getOpenToCapture() > 0 && (
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${(getOpenToCapture() / getOriginalAmount()) * 100}%` }}
                      title={`Open to Capture: ${formatPrice(getOpenToCapture())}`}
                    />
                  )}
                  {getRefundedAmount() > 0 && (
                    <div
                      className="bg-orange-500 h-full transition-all duration-500"
                      style={{ width: `${(getRefundedAmount() / getOriginalAmount()) * 100}%` }}
                      title={`Refunded: ${formatPrice(getRefundedAmount())}`}
                    />
                  )}
                  {getVoidedAmount() > 0 && (
                    <div
                      className="bg-red-500 h-full transition-all duration-500"
                      style={{ width: `${(getVoidedAmount() / getOriginalAmount()) * 100}%` }}
                      title={`Voided: ${formatPrice(getVoidedAmount())}`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs dark:text-afterpay-gray-300">
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
              <div className="space-y-3 pt-4 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Original Amount</span>
                  <span className="font-medium dark:text-white">{formatPrice(getOriginalAmount())}</span>
                </div>
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Captured</span>
                  <span className="font-medium">{formatPrice(getCapturedAmount())}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                  <span>Refunded</span>
                  <span className="font-medium">-{formatPrice(getRefundedAmount())}</span>
                </div>
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <span>Voided</span>
                  <span className="font-medium">-{formatPrice(getVoidedAmount())}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
                  <span className="font-medium dark:text-white">Open to Capture</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatPrice(getOpenToCapture())}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium dark:text-white">Available to Refund</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{formatPrice(getAvailableToRefund())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Status */}
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-afterpay-mint/10 dark:from-afterpay-gray-700 dark:to-afterpay-mint/20 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Actions</h2>
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
              <div className="mt-4 text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">
                <p><strong className="dark:text-white">Capture:</strong> Collect authorized funds (available for 13 days after authorization)</p>
                <p><strong className="dark:text-white">Refund:</strong> Return captured funds to the customer</p>
                <p><strong className="dark:text-white">Void:</strong> Cancel uncaptured authorized funds</p>
              </div>
            </div>
          </div>

          {/* Event History */}
          {((payment.events && payment.events.length > 0) || (payment.refunds && payment.refunds.length > 0)) && (
            <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-afterpay-gray-50 to-purple-50 dark:from-afterpay-gray-700 dark:to-purple-900/30 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
                <h2 className="text-lg font-semibold dark:text-white">Event History</h2>
              </div>
              <div className="divide-y divide-afterpay-gray-200 dark:divide-afterpay-gray-700">
                {[
                  ...(payment.events || []).map((event) => ({
                    id: `event-${event.id}`,
                    type: event.type,
                    created: event.created,
                    amount: event.amount,
                  })),
                  ...(payment.refunds || [])
                    .filter((refund) => !payment.events?.some((e) => e.id === refund.refundId))
                    .map((refund) => ({
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
                          item.type === "AUTH_APPROVED" || item.type === "AUTH" || item.type === "AUTH_PENDING" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" :
                          item.type === "CAPTURED" || item.type === "CAPTURE" || item.type === "CAPTURE_APPROVED" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" :
                          item.type === "REFUND" || item.type === "REFUNDED" || item.type === "REFUND_APPROVED" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" :
                          item.type === "VOID" || item.type === "VOIDED" || item.type === "VOID_APPROVED" ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">
                          {new Date(item.created).toLocaleString()}
                        </span>
                      </div>
                      <span className="font-medium dark:text-white">{formatPrice(parseFloat(item.amount.amount))}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!payment && !isLoading && !error && (
        <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl shadow-sm border border-afterpay-gray-200 dark:border-afterpay-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-afterpay-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 dark:text-white">No Payment Selected</h3>
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
            Enter an order ID above to view payment details and perform actions.
          </p>
        </div>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-afterpay-gray-50 dark:bg-afterpay-gray-900 pb-72">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-afterpay-gray-600 dark:text-afterpay-gray-400 hover:text-afterpay-black dark:hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl font-display font-bold dark:text-white">Admin</h1>
          </div>
          <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
            Configure your Afterpay demo platform
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-6 border-b border-afterpay-gray-200 dark:border-afterpay-gray-700 mb-8">
          <button
            onClick={() => setActiveTab("configuration")}
            className={`pb-3 text-sm font-display font-semibold transition-colors relative ${
              activeTab === "configuration"
                ? "text-afterpay-black dark:text-white"
                : "text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
            }`}
          >
            Configuration
            {activeTab === "configuration" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-afterpay-mint" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`pb-3 text-sm font-display font-semibold transition-colors relative ${
              activeTab === "operations"
                ? "text-afterpay-black dark:text-white"
                : "text-afterpay-gray-500 dark:text-afterpay-gray-400 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
            }`}
          >
            Payment Operations
            {activeTab === "operations" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-afterpay-mint" />
            )}
          </button>
        </div>

        {/* Tab Content — always-mounted to preserve state across tab switches */}
        <div style={{ display: activeTab === "configuration" ? "block" : "none" }}>
          {renderConfigurationTab()}
        </div>
        <div style={{ display: activeTab === "operations" ? "block" : "none" }}>
          {renderOperationsTab()}
        </div>
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

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-afterpay-gray-50 dark:bg-afterpay-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-afterpay-mint border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">Loading Admin Panel...</p>
          </div>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
