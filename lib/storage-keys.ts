// Centralized storage key constants to prevent typos and enable easy refactoring.

// sessionStorage keys
export const STORAGE_KEYS = {
  /** Stores pending order data (items, total) for the confirmation page */
  PENDING_ORDER: "afterpay_pending_order",
  /** Stores cart data during deferred shipping checkout flow */
  CHECKOUT_CART: "afterpay_checkout_cart",
} as const;

// localStorage keys
export const LOCAL_STORAGE_KEYS = {
  /** Persists dev panel resize height */
  DEV_PANEL_HEIGHT: "devPanelHeight",
} as const;
