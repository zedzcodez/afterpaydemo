export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in dollars
  currency: string;
  image: string;
  sku: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  shippingAmount: Money;
  taxAmount?: Money;
  orderAmount: Money;
}

export interface Money {
  amount: string;
  currency: string;
}

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  area1: string; // city
  area2?: string; // state
  postcode: string;
  countryCode: string;
  phoneNumber?: string;
}

export interface Consumer {
  givenNames: string;
  surname: string;
  email: string;
  phoneNumber?: string;
}

export interface CheckoutRequest {
  amount: Money;
  consumer?: Consumer;
  billing?: Address;
  shipping?: Address;
  items?: CheckoutItem[];
  merchantReference?: string;
  merchant: {
    redirectConfirmUrl: string;
    redirectCancelUrl: string;
    popupOriginUrl?: string;
  };
  mode?: "standard" | "express";
  isCashAppPay?: boolean;
}

export interface CheckoutItem {
  name: string;
  sku?: string;
  quantity: number;
  price: Money;
}

export interface CheckoutResponse {
  token: string;
  expires: string;
  redirectCheckoutUrl: string;
  amount?: Money;
  shipping?: Address;
  shippingOptionIdentifier?: string;
}

export interface AuthResponse {
  id: string;
  token: string;
  status: "APPROVED" | "DECLINED";
  created: string;
  originalAmount: Money;
  openToCapture: Money;
  events: PaymentEvent[];
}

export interface PaymentEvent {
  id: string;
  created: string;
  type: string;
  amount: Money;
}

export interface CaptureResponse {
  id: string;
  status: string;
  created: string;
  originalAmount: Money;
  openToCapture: Money;
  events: PaymentEvent[];
}

// Afterpay.js types for Express Checkout
declare global {
  interface Window {
    Afterpay?: {
      // Express Checkout methods
      initializeForPopup: (config: AfterpayPopupConfig) => void;
      initializeForRedirect: (config: AfterpayRedirectConfig) => void;
      ADDRESS_MODES: {
        ADDRESS_WITH_SHIPPING_OPTIONS: string;
        SHIP_TO_ORDER_ADDRESS: string;
        PICKUP_FROM_ORDER_ADDRESS: string;
        ADDRESS_WITHOUT_SHIPPING_OPTIONS: string;
        NO_ADDRESS: string;
      };
      onMessage: (callback: (message: AfterpayMessage) => void) => void;
      // Standard Checkout popup methods
      initialize: (config: { countryCode: string }) => void;
      open: () => void;
      transfer: (config: { token: string }) => void;
      onComplete: ((event: AfterpayCompleteEvent) => void) | null;
      // Widget classes
      Widgets: {
        PaymentSchedule: new (config: AfterpayPaymentScheduleConfig) => AfterpayPaymentScheduleWidget;
      };
      // Cash App Pay methods
      initializeForCashAppPay: (config: CashAppPayConfig) => void;
      initializeCashAppPayListeners: (config: { onComplete: (event: CashAppPayCompleteEvent) => void }) => void;
      restartCashAppPay: () => void;
      renderCashAppPayButton: (config?: {
        countryCode?: string;
        cashAppPayButtonOptions?: {
          size?: 'small' | 'medium';
          width?: 'full' | 'static';
          theme?: 'dark' | 'light';
          shape?: 'round' | 'semiround';
        };
      }) => void;
    };
  }
}

export interface AfterpayPaymentScheduleConfig {
  token: string;
  amount: Money;
  target: string;
  locale?: string;
  onReady?: (event: { data: object }) => void;
  onChange?: (event: { data: { paymentScheduleChecksum: string; isValid: boolean } }) => void;
  onError?: (event: { data: { error: string } }) => void;
}

export interface AfterpayPaymentScheduleWidget {
  update: (config: { amount: Money }) => void;
  paymentScheduleChecksum: string;
}

export interface AfterpayPopupConfig {
  countryCode: string;
  target: string;
  addressMode?: string;
  shippingOptionRequired?: boolean;
  buyNow?: boolean;
  onCommenceCheckout: (actions: AfterpayActions) => void;
  onComplete: (event: AfterpayCompleteEvent) => void;
  onShippingAddressChange?: (
    data: AfterpayShippingAddressData,
    actions: AfterpayShippingActions
  ) => void;
  onShippingOptionChange?: (data: AfterpayShippingOptionData) => void;
}

export interface AfterpayRedirectConfig {
  countryCode: string;
  target: string;
  addressMode?: string;
}

export interface AfterpayActions {
  resolve: (token: string) => void;
  reject: (error: AfterpayError) => void;
}

export interface AfterpayShippingActions {
  resolve: (options: AfterpayShippingOption[]) => void;
  reject: (error: AfterpayError) => void;
}

export interface AfterpayShippingOption {
  id: string;
  name: string;
  description?: string;
  shippingAmount: Money;
  taxAmount?: Money;
  orderAmount: Money;
}

export interface AfterpayError {
  message: string;
}

export interface AfterpayCompleteEvent {
  data: {
    status: "SUCCESS" | "CANCEL";
    orderToken: string;
    orderInfo?: {
      shippingOptionIdentifier?: string;
      shippingAddress?: Address;
      consumer?: Consumer;
    };
  };
}

export interface AfterpayShippingAddressData {
  address: {
    area1: string;
    area2?: string;
    countryCode: string;
    postcode: string;
  };
}

export interface AfterpayShippingOptionData {
  shippingOptionIdentifier: string;
}

export interface AfterpayMessage {
  severity: "log" | "warning" | "error";
  message: string;
}

export interface CashAppPayConfig {
  countryCode: string;
  token: string;
  cashAppPayOptions: {
    button?: {
      size?: 'small' | 'medium';
      width?: 'full' | 'static';
      theme?: 'dark' | 'light';
      shape?: 'round' | 'semiround';
    } | false;
    onComplete: (event: CashAppPayCompleteEvent) => void;
    eventListeners?: {
      CUSTOMER_INTERACTION?: (event: { isMobile: boolean }) => void;
      CUSTOMER_REQUEST_APPROVED?: () => void;
      CUSTOMER_REQUEST_DECLINED?: () => void;
      CUSTOMER_REQUEST_FAILED?: () => void;
      CUSTOMER_DISMISSED?: () => void;
    };
    manage?: boolean;
    onBegin?: (args: { begin: () => void }) => void;
  };
}

export interface CashAppPayCompleteEvent {
  data: {
    status: 'SUCCESS' | 'CANCELLED';
    cashtag?: string;
    orderToken: string;
  };
}
