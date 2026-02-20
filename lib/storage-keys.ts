// Centralized storage key constants to prevent typos and enable easy refactoring.

// sessionStorage keys
export const STORAGE_KEYS = {
  /** Stores pending order data (items, total) for the confirmation page */
  PENDING_ORDER: "afterpay_pending_order",
  /** Stores cart data during deferred shipping checkout flow */
  CHECKOUT_CART: "afterpay_checkout_cart",
  /** Stores checkout flow logs (API calls, callbacks, redirects) */
  FLOW_LOGS: "afterpay-flow-logs",
} as const;

export function savePendingOrder(
  items: Array<{ product: { id: string; name: string; price: number }; quantity: number }>,
  total: number,
  key: string = STORAGE_KEYS.PENDING_ORDER
): void {
  sessionStorage.setItem(key, JSON.stringify({
    items: items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    })),
    total,
  }));
}

// localStorage keys
export const LOCAL_STORAGE_KEYS = {
  /** Persists dev panel resize height */
  DEV_PANEL_HEIGHT: "devPanelHeight",
  /** Persists shopping cart items */
  CART: "afterpay-demo-cart",
  /** Persists application configuration (checkout mode, capture mode, etc.) */
  CONFIG: "afterpay-demo-config",
  /** Persists order history */
  ORDERS: "afterpay-demo-orders",
  /** Persists theme preference (light/dark/system) */
  THEME: "theme",
} as const;
