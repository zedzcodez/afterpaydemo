"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { useConfig } from "@/components/ConfigProvider";
import { formatPrice } from "@/lib/products";
import { CheckoutStandard } from "@/components/CheckoutStandard";
import { CheckoutCashApp } from "@/components/CheckoutCashApp";
import { FlowLogsDevPanel } from "@/components/FlowLogsDevPanel";
import { OSMInfoSection } from "@/components/OSMInfoSection";
import { CodeViewer } from "@/components/CodeViewer";
import { CashAppInfoSection } from "@/components/CashAppInfoSection";
import { toggleDevPanel, useDevPanelState } from "@/components/FlowLogsDevPanel";
import { getCartSkus, getCartCategories } from "@/lib/cart";
import type { CheckoutFormData, LocalShippingOption } from "@/lib/types";

const FREE_SHIPPING_THRESHOLD = 100;

const getShippingOptions = (cartTotal: number): LocalShippingOption[] => {
  const options: LocalShippingOption[] = [
    { id: "standard", name: "Standard Shipping", description: "5-7 business days", price: 5.99 },
    { id: "express", name: "Express Shipping", description: "2-3 business days", price: 12.99 },
    { id: "overnight", name: "Overnight Shipping", description: "Next business day", price: 24.99 },
  ];

  if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
    options.unshift({
      id: "free",
      name: "Free Shipping",
      description: `5-7 business days \u2022 Orders over $${FREE_SHIPPING_THRESHOLD}`,
      price: 0,
    });
  }

  return options;
};

type PaymentMethod = "afterpay" | "cashapp";

export default function CheckoutPage() {
  const { items, total } = useCart();
  const { config } = useConfig();
  const isDevPanelOpen = useDevPanelState();
  const formRef = useRef<HTMLFormElement>(null);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("afterpay");

  // Form state
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
  });

  // Shipping state
  const shippingOptions = getShippingOptions(total);
  const [selectedShipping, setSelectedShipping] = useState<LocalShippingOption>(shippingOptions[0]);
  const [shippingAnimationKey, setShippingAnimationKey] = useState(0);

  // Track form validity for enabling/disabling payment buttons
  const [isFormValid, setIsFormValid] = useState(false);

  const finalTotal = total + selectedShipping.price;

  const checkoutMode = config.standardCheckout.method === "popup" ? "popup" : "redirect";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Check form validity whenever formData changes
  useEffect(() => {
    if (formRef.current) {
      setIsFormValid(formRef.current.checkValidity());
    }
  }, [formData]);

  const handleShippingSelect = useCallback((option: LocalShippingOption) => {
    setSelectedShipping(option);
    setShippingAnimationKey((prev) => prev + 1);
  }, []);

  // Auto-select first shipping option when options change
  useEffect(() => {
    const options = getShippingOptions(total);
    if (options.length > 0) {
      setSelectedShipping(options[0]);
    }
  }, [total]);

  // Form validation — triggers HTML5 validation UI
  const validateForm = useCallback((): boolean => {
    if (formRef.current) {
      return formRef.current.reportValidity();
    }
    return false;
  }, []);

  // Code snippets for developer mode
  const standardCode = `
// Standard Checkout - Server-Side API Flow

// Step 1: Create Checkout (Server)
const response = await fetch('https://global-api-sandbox.afterpay.com/v2/checkouts', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(MERCHANT_ID + ':' + SECRET_KEY),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' },
    consumer: {
      givenNames: 'John',
      surname: 'Doe',
      email: 'john@example.com'
    },
    merchant: {
      redirectConfirmUrl: 'https://yoursite.com/confirmation',
      redirectCancelUrl: 'https://yoursite.com/checkout'
    }
  })
});

const { token, redirectCheckoutUrl } = await response.json();

// Step 2: Redirect customer to Afterpay
window.location.href = redirectCheckoutUrl;

// Step 3: After customer confirms, authorize payment
const authResponse = await fetch('/v2/payments/auth', {
  method: 'POST',
  body: JSON.stringify({ token })
});

const { id: orderId, status } = await authResponse.json();

// Step 4: Capture payment (can be deferred up to 13 days)
const captureResponse = await fetch('/v2/payments/' + orderId + '/capture', {
  method: 'POST',
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' }
  })
});`;

  const popupCode = `
// Standard Checkout - Popup Flow (Afterpay.js)

// Step 1: Create Checkout (Server)
const response = await fetch('/api/afterpay/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: { amount: '${finalTotal.toFixed(2)}', currency: 'USD' },
    consumer: { givenNames: 'John', surname: 'Doe', email: 'john@example.com' },
    merchant: {
      redirectConfirmUrl: 'https://yoursite.com/confirmation',
      redirectCancelUrl: 'https://yoursite.com/checkout'
    }
  })
});

const { token } = await response.json();

// Step 2: Initialize Afterpay.js
Afterpay.initialize({ countryCode: 'US' });

// Step 3: Set up completion handler
Afterpay.onComplete = async (event) => {
  if (event.data.status === 'SUCCESS') {
    // Authorize payment
    const authResponse = await fetch('/api/afterpay/auth', {
      method: 'POST',
      body: JSON.stringify({ token: event.data.orderToken })
    });
    const { id: orderId } = await authResponse.json();

    // Capture payment
    await fetch('/api/afterpay/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount: ${finalTotal.toFixed(2)} })
    });
  }
};

// Step 4: Open popup and transfer token
Afterpay.open();
Afterpay.transfer({ token });`;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-display font-bold mb-4">Your cart is empty</h1>
        <p className="text-afterpay-gray-600 mb-6">
          Add some products before checking out
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold dark:text-white">Checkout</h1>
            <p className="text-afterpay-gray-600">
              {items.length} {items.length === 1 ? "item" : "items"} -{" "}
              {formatPrice(total)}
            </p>
          </div>
          <Link
            href="/cart"
            className="text-afterpay-gray-600 hover:text-afterpay-black dark:hover:text-white"
          >
            Edit Cart
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Developer Sections — only visible in developer mode */}
            {config.developerMode && (
              <div className="space-y-3 mb-8">
                {/* Developer Panel Toggle */}
                <div className="flex items-center justify-between p-3 bg-afterpay-gray-100 dark:bg-afterpay-gray-800 rounded-lg">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-afterpay-black dark:text-white">Developer Panel</p>
                    <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400">
                      View API requests, responses, and integration flow logs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDevPanel(25)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDevPanelOpen
                        ? "bg-afterpay-mint text-afterpay-black hover:bg-afterpay-mint-dark"
                        : "bg-afterpay-gray-800 dark:bg-afterpay-gray-700 text-white hover:bg-afterpay-gray-700 dark:hover:bg-afterpay-gray-600"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {isDevPanelOpen ? "Hide Developer Panel" : "Show Developer Panel"}
                  </button>
                </div>

                {/* Checkout Method Indicator */}
                <div>
                  <label className="block text-sm font-medium mb-3">Checkout Method</label>
                  <div className="flex gap-2">
                    <div
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        checkoutMode === "redirect"
                          ? "border-afterpay-mint bg-afterpay-mint/10"
                          : "border-afterpay-gray-200 dark:border-afterpay-gray-700"
                      }`}
                    >
                      <span className="block font-medium">Redirect</span>
                      <span className="block text-xs text-afterpay-gray-500">
                        Full page navigation
                      </span>
                    </div>
                    <div
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        checkoutMode === "popup"
                          ? "border-afterpay-mint bg-afterpay-mint/10"
                          : "border-afterpay-gray-200 dark:border-afterpay-gray-700"
                      }`}
                    >
                      <span className="block font-medium">Popup</span>
                      <span className="block text-xs text-afterpay-gray-500">
                        Modal overlay
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-afterpay-gray-500 mt-2">
                    Controlled via Settings panel
                  </p>
                </div>

                {/* Mode Description */}
                <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4 text-sm">
                  {checkoutMode === "redirect" ? (
                    <>
                      <p className="font-medium mb-2">Redirect Flow</p>
                      <p className="text-afterpay-gray-600">
                        Customer is redirected to Afterpay&apos;s checkout page. After completing
                        the checkout, they return to your review page where you can authorize
                        and capture the payment.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium mb-2">Popup Flow</p>
                      <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400">
                        Uses Afterpay.js to open a modal popup. Customer completes checkout
                        without leaving your site. Payment is authorized and captured via
                        the <code className="bg-afterpay-gray-200 dark:bg-afterpay-gray-700 px-1.5 py-0.5 rounded text-afterpay-black dark:text-afterpay-mint font-mono text-xs">onComplete</code> callback.
                      </p>
                    </>
                  )}
                </div>

                {/* Code Viewer */}
                <CodeViewer
                  title={`View ${checkoutMode === "redirect" ? "Redirect" : "Popup"} Checkout Code`}
                  code={checkoutMode === "redirect" ? standardCode : popupCode}
                />

                {/* Cash App Info Section */}
                {config.cashAppPay.enabled && <CashAppInfoSection />}
              </div>
            )}

            {/* Shared Checkout Form */}
            <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="font-medium mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                    required
                    className="input-styled"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                    className="input-styled"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="font-medium mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      required
                      className="input-styled"
                    />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      required
                      className="input-styled"
                    />
                  </div>
                  <input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    placeholder="Address"
                    required
                    className="input-styled"
                  />
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, etc. (optional)"
                    className="input-styled"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      required
                      className="input-styled"
                    />
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State"
                      required
                      className="input-styled"
                    />
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleInputChange}
                      placeholder="ZIP code"
                      required
                      className="input-styled"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div>
                <h3 className="font-medium mb-4">Shipping Method</h3>
                <div className="space-y-2">
                  {shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedShipping.id === option.id
                          ? "border-afterpay-mint bg-afterpay-mint/10"
                          : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="shipping"
                          value={option.id}
                          checked={selectedShipping.id === option.id}
                          onChange={() => handleShippingSelect(option)}
                          className="radio-mint mr-3"
                        />
                        <div>
                          <span className="font-medium">{option.name}</span>
                          {option.description && (
                            <p className="text-sm text-afterpay-gray-500 dark:text-afterpay-gray-400">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">
                        {option.price === 0 ? (
                          <span className="text-green-600 dark:text-green-400">FREE</span>
                        ) : (
                          formatPrice(option.price)
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </form>

            {/* Order Totals */}
            <div className="mt-6 bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {selectedShipping.price === 0 ? (
                      <span className="text-green-600 dark:text-green-400">FREE</span>
                    ) : (
                      formatPrice(selectedShipping.price)
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-2">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-8">
              <h3 className="font-medium mb-4">Payment Methods</h3>

              {/* Payment method radio selection */}
              <div className="space-y-2 mb-4">
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === "afterpay"
                      ? "border-afterpay-mint bg-afterpay-mint/10"
                      : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="afterpay"
                    checked={paymentMethod === "afterpay"}
                    onChange={() => setPaymentMethod("afterpay")}
                    className="radio-mint mr-3"
                  />
                  <div className="flex items-center gap-2">
                    <img
                      src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-color-black-32.svg"
                      alt="Afterpay"
                      height="20"
                      className="h-5 dark:hidden"
                    />
                    <img
                      src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-color-white-32.svg"
                      alt="Afterpay"
                      height="20"
                      className="h-5 hidden dark:block"
                    />
                  </div>
                </label>

                {config.cashAppPay.enabled && (
                  <label
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === "cashapp"
                        ? "border-afterpay-mint bg-afterpay-mint/10"
                        : "border-afterpay-gray-200 dark:border-afterpay-gray-700 hover:border-afterpay-gray-300 dark:hover:border-afterpay-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cashapp"
                      checked={paymentMethod === "cashapp"}
                      onChange={() => setPaymentMethod("cashapp")}
                      className="radio-mint mr-3"
                    />
                    <div className="flex items-center gap-2">
                      <img
                        src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/cashapppay-color-black-32.svg"
                        alt="Cash App Pay"
                        height="20"
                        className="h-5 dark:hidden"
                      />
                      <img
                        src="https://static.afterpaycdn.com/en-US/integration/logo/lockup/cashapppay-color-white-32.svg"
                        alt="Cash App Pay"
                        height="20"
                        className="h-5 hidden dark:block"
                      />
                    </div>
                  </label>
                )}
              </div>

              {/* Selected payment button */}
              {/* Always mount both components to avoid SDK reload errors.
                  Use CSS hidden + selected prop to control visibility & initialization. */}
              <div className={`mt-4 ${paymentMethod === "afterpay" ? "" : "hidden"}`}>
                <CheckoutStandard
                  formData={formData}
                  selectedShipping={selectedShipping}
                  total={total}
                  finalTotal={finalTotal}
                  onValidate={validateForm}
                  disabled={!isFormValid}
                />
              </div>
              {config.cashAppPay.enabled && (
                <div className={`mt-4 ${paymentMethod === "cashapp" ? "" : "hidden"}`}>
                  <CheckoutCashApp
                    formData={formData}
                    selectedShipping={selectedShipping}
                    total={total}
                    finalTotal={finalTotal}
                    onValidate={validateForm}
                    disabled={!isFormValid}
                    selected={paymentMethod === "cashapp"}
                  />
                </div>
              )}

              {!isFormValid && (
                <p className="text-sm text-afterpay-gray-500 mt-3">
                  Complete the form above to enable payment options
                </p>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-afterpay-gray-50 dark:bg-afterpay-gray-800 rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-display font-semibold mb-4 dark:text-white">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-afterpay-gray-100 dark:bg-afterpay-gray-700 rounded overflow-hidden relative flex-shrink-0">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-afterpay-gray-500">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div
                  key={`shipping-${shippingAnimationKey}`}
                  className={`flex justify-between text-sm rounded -mx-2 px-2 py-1 ${
                    selectedShipping ? "text-afterpay-black dark:text-white" : "text-afterpay-gray-500"
                  } ${shippingAnimationKey > 0 ? "animate-highlight-update" : ""}`}
                >
                  <span>Shipping</span>
                  <span>
                    {selectedShipping.price === 0
                      ? "FREE"
                      : formatPrice(selectedShipping.price)}
                  </span>
                </div>
                <div
                  key={`total-${shippingAnimationKey}`}
                  className={`flex justify-between font-semibold text-lg pt-2 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700 rounded -mx-2 px-2 py-1 ${
                    shippingAnimationKey > 0 ? "animate-highlight-update" : ""
                  }`}
                >
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
                <p className="text-xs text-afterpay-gray-500 dark:text-afterpay-gray-400 pt-1">
                  Includes all applicable taxes, discounts, and promotions
                </p>
              </div>

              {/* Afterpay OSM & Developer Info */}
              <div className="mt-6 pt-6 border-t border-afterpay-gray-200 dark:border-afterpay-gray-700">
                <OSMInfoSection
                  pageType="cart"
                  amount={finalTotal}
                  currency="USD"
                  productSku={getCartSkus(items)}
                  productCategory={getCartCategories(items)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Panel */}
      <FlowLogsDevPanel />
    </div>
  );
}
