import { LocalShippingOption } from "./types";
import { roundCurrency } from "./cart";

export const FREE_SHIPPING_THRESHOLD = 100;

/**
 * Base shipping options used across the app.
 * The shipping page uses these directly (price as number).
 * Express/BuyNow flows use getAfterpayShippingOptions() for the API format.
 */
export const SHIPPING_OPTIONS: LocalShippingOption[] = [
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

/**
 * Builds shipping options in Afterpay's API format for the popup SDK callbacks.
 * Applies free standard shipping when the cart total >= $100.
 */
export function getAfterpayShippingOptions(cartTotal: number) {
  return SHIPPING_OPTIONS.map((opt) => {
    const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD && opt.id === "standard";
    return {
      id: opt.id,
      name: isFreeShipping ? "Free Standard Shipping" : opt.name,
      description: opt.description,
      shippingAmount: isFreeShipping
        ? { amount: "0.00", currency: "USD" }
        : { amount: opt.price.toFixed(2), currency: "USD" },
      taxAmount: { amount: "0.00", currency: "USD" },
      orderAmount: {
        amount: roundCurrency(cartTotal + (isFreeShipping ? 0 : opt.price)).toFixed(2),
        currency: "USD",
      },
    };
  });
}
