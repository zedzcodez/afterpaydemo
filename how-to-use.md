# How to Use This Demo

This guide walks you through testing all features of the Afterpay Demo Shop, with explanations of the technical implementation details you can review.

---

## At a Glance

| Feature | What It Does | Demo URL | Afterpay Docs |
|---------|--------------|----------|---------------|
| On-Site Messaging | "Pay in 4" or "Pay Monthly" badges | `/products/1` | [OSM Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging) |
| Express Checkout | Popup checkout with shipping options | `/checkout` | [Express Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout) |
| Standard Checkout | Redirect or popup to Afterpay | `/checkout` | [API Quickstart](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart) |
| Deferred Capture | Authorize now, capture later | `/admin` | [Deferred Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture) |
| Payment Admin | Capture, refund, void payments | `/admin` | [Payments API](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments) |
| Webhooks | Async payment notifications | `/admin` | [Webhooks](https://developers.cash.app/cash-app-afterpay/guides/api-development/webhook-signature-generation) |
| Order History | Track completed orders | `/orders` | - |

> **Common Patterns Across All Flows**
>
> - **Amount Format**: Always `{ amount: "10.00", currency: "USD" }` (string with 2 decimals)
> - **Token Flow**: Checkout Token → Order Token (from redirect) → Order ID (after auth)
> - **Error Handling**: All API routes return `{ error: string }` on failure
> - **Sandbox Base URL**: `https://global-api-sandbox.afterpay.com`

---

## Table of Contents

### Part 1: Getting Started
1. [Quick Start](#quick-start)

### Part 2: Afterpay Payment Features
2. [On-Site Messaging (OSM)](#on-site-messaging-osm)
3. [Express Checkout](#express-checkout)
4. [Standard Checkout](#standard-checkout)
5. [Capture Modes](#capture-modes)

### Part 3: Payment Operations
6. [Payment Admin Panel](#payment-admin-panel)
7. [Webhook Handler](#webhook-handler)
8. [Order History](#order-history)

### Part 4: API Reference
9. [Local to Afterpay API Mapping](#local-to-afterpay-api-mapping)
10. [API Flow Diagrams](#api-flow-diagrams)
11. [Test Credentials](#test-credentials)
12. [Troubleshooting](#troubleshooting)

### Part 5: Developer Tools
13. [Developer Panel](#developer-panel)
14. [Integration Flow Summary](#integration-flow-summary)
15. [Code Viewer](#code-viewer)

### Part 6: App Customization
16. [Settings & Preferences](#settings--preferences)
17. [Navigation](#navigation)
18. [Design System](#design-system)
19. [UI Components](#ui-components)
20. [In-App Documentation](#in-app-documentation)

### Part 7: Reference
21. [Changelog](#changelog)

---

# Part 1: Getting Started

## Quick Start

**Try the demo at: [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)**

1. Visit the live demo
2. Add products to cart
3. Go to Checkout and test different flows
4. Use sandbox credentials to complete checkout

### Sandbox Test Account

You can create test customer accounts in the sandbox environment within your test checkout flow. Each customer account requires a unique email address and phone number.

- **Email**: Use any unique email address
- **Phone**: Use any phone number
- **Verification Code**: Use `111111` (no SMS messages are sent in sandbox)

See [Test Customer Accounts](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#test-customer-accounts) and [Sandbox Business Hub](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#sandbox-business-hub) for more details.

---

# Part 2: Afterpay Payment Features

## On-Site Messaging (OSM)

### What It Does
Displays "Pay in 4 interest-free payments of $X.XX" badges (or "Pay Monthly" messaging, if the feature is enabled for the merchant account) to inform customers about Afterpay availability.

### Where to Test

| Page | Location | URL |
|------|----------|-----|
| Product Detail | Below product price | `/products/1` |
| Cart | Below cart total | `/cart` |
| Checkout | In order summary | `/checkout` |

### How to Test
1. Navigate to any product page
2. Observe the Afterpay badge below the price
3. Click the badge to open the info modal
4. Add items to cart and see the badge update with new totals

### Technical Details

**Component:** `components/OSMPlacement.tsx`

**Implementation:**
```tsx
<square-placement
  data-mpid={process.env.NEXT_PUBLIC_AFTERPAY_MPID}
  data-placement-id={placementId}
  data-page-type={pageType}
  data-amount={amount}
  data-currency={currency}
/>
```

**Key Configuration:**
- `data-page-type`: Either `product` (PDP) or `cart` (Cart/Checkout)
- Different placement IDs for PDP vs Cart
- Amount updates automatically when cart changes

#### Integration Code

**1. Include the script (once per page):**
```html
<script src="https://js.squarecdn.com/square-marketplace.js"></script>
```

**2. Add the placement element:**
```html
<square-placement
  data-mpid="YOUR_MPID"
  data-placement-id="YOUR_PLACEMENT_ID"
  data-page-type="product"
  data-amount="99.00"
  data-currency="USD"
  data-item-skus="SKU-123"
  data-item-categories="Electronics"
  data-is-eligible="true"
></square-placement>
```

**Required Environment Variables:**
```bash
NEXT_PUBLIC_AFTERPAY_MPID=your-merchant-mpid
NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID=your-pdp-placement-id
NEXT_PUBLIC_OSM_CART_PLACEMENT_ID=your-cart-placement-id
```

> **Note:** Use different `placement-id` values for product pages (PDP) vs cart/checkout pages. This enables contextual messaging and conversion tracking.

#### Dark Mode Support

The official OSM widget renders with a light background. In dark mode, the widget container maintains a light background to ensure the widget displays correctly with its info icon and accurate payment calculations.

**Implementation:**
```tsx
{/* Light background container ensures widget visibility in dark mode */}
<div className="p-4 bg-afterpay-gray-50 rounded-lg">
  <OSMPlacement pageType="product" amount={product.price} />
</div>
```

**Afterpay Documentation:** [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging)

<details>
<summary>✓ Verify This Feature</summary>

- [ ] OSM displays on product pages
- [ ] OSM displays on cart page
- [ ] OSM displays on checkout page
- [ ] Amount updates when cart changes
- [ ] Info modal opens on click

</details>

---

## Express Checkout

Express Checkout uses Afterpay.js to provide a streamlined popup-based checkout experience.

### API Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPRESS CHECKOUT FLOW                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Initialize Afterpay.js                                                  │
│     window.AfterPay.initialize({ countryCode: 'US' })                       │
│                                                                             │
│  2. Create Checkout                                                         │
│     LOCAL:    POST /api/afterpay/checkout                                   │
│     AFTERPAY: POST /v2/checkouts                                            │
│                                                                             │
│  3. Open Popup                                                              │
│     window.AfterPay.open() with onShippingAddressChange callback            │
│                                                                             │
│  4. Customer Completes in Popup                                             │
│     → Returns orderToken via onComplete callback                            │
│                                                                             │
│  5. Authorize Payment                                                       │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│                                                                             │
│  6. Capture (if immediate mode)                                             │
│     LOCAL:    POST /api/afterpay/capture-full                               │
│     AFTERPAY: POST /v2/payments/capture                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Shipping Flow Options

#### 1. Integrated Shipping

**What It Does:** Customer selects shipping options directly within the Afterpay popup.

**How to Test:**
1. Go to `/checkout`
2. Select **Express Checkout** tab
3. Select **Integrated** shipping flow
4. Click "Pay with Afterpay"
5. In the popup, enter address
6. Select from shipping options provided
7. Complete checkout
8. View confirmation page

**Technical Details:**

**File:** `components/CheckoutExpress.tsx`

**Key Callback:**
```typescript
onShippingAddressChange: (addressData, actions) => {
  // Calculate shipping options based on address
  const options = getShippingOptions();
  actions.resolve(options);
}
```

**Shipping Option Structure:**
```typescript
{
  id: 'standard',
  name: 'Standard Shipping',
  description: '5-7 business days',
  shippingAmount: { amount: '5.99', currency: 'USD' },
  taxAmount: { amount: '0.00', currency: 'USD' },
  orderAmount: { amount: '105.99', currency: 'USD' }
}
```

<details>
<summary>✓ Verify Integrated Shipping</summary>

- [ ] Popup opens correctly
- [ ] Shipping options display in popup
- [ ] Shipping selection updates total
- [ ] Checkout completes successfully
- [ ] Confirmation page displays

</details>

#### 2. Deferred Shipping

**What It Does:** Customer confirms address in Afterpay popup, then returns to merchant site to select shipping. Requires displaying the Payment Schedule Widget.

**How to Test:**
1. Go to `/checkout`
2. Select **Express Checkout** tab
3. Select **Deferred** shipping flow
4. Click "Pay with Afterpay"
5. Complete popup (no shipping selection)
6. Return to shipping page (`/checkout/shipping`)
7. Select shipping option (widget updates)
8. Click "Place Order"

**Technical Details:**

**Files:**
- `components/CheckoutExpress.tsx` - Initial popup
- `app/checkout/shipping/page.tsx` - Shipping selection page

**Payment Schedule Widget** (displayed on `/checkout/shipping` page):

This widget shows customers their 4-payment installment schedule and must be displayed during deferred shipping flow.

**1. Include the script:**
```html
<script src="https://portal.afterpay.com/afterpay.js"></script>
```

**2. Add the widget container:**
```html
<div id="afterpay-widget"></div>
```

**3. Initialize the widget:**
```typescript
const widget = new AfterPay.Widgets.PaymentSchedule({
  token: checkoutToken,  // From /v2/checkouts response
  amount: { amount: "99.00", currency: "USD" },
  target: "#afterpay-widget",
  locale: "en-US",
  theme: "light",  // "light" or "dark"

  onReady: (event) => {
    console.log("Widget ready:", event.data);
  },

  onChange: (event) => {
    // Required for deferred shipping - store for auth request
    const checksum = event.data.paymentScheduleChecksum;
    const isValid = event.data.isValid;
  },

  onError: (event) => {
    console.error("Widget error:", event.data.error);
  }
});

// Update when total changes (e.g., shipping selection)
widget.update({
  amount: { amount: newTotal.toFixed(2), currency: "USD" }
});
```

> **Checksum Required:** When using deferred shipping with an adjusted order amount, you **must** include `paymentScheduleChecksum` in your `/v2/payments/auth` request. Without it, authorization will fail.

**Afterpay Documentation:** [Express Checkout Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout)

<details>
<summary>✓ Verify Deferred Shipping</summary>

- [ ] Popup opens correctly
- [ ] Returns to shipping page
- [ ] Payment Schedule Widget loads
- [ ] Widget updates on shipping change
- [ ] Checkout completes successfully

</details>

---

## Standard Checkout

Standard Checkout uses server-side API calls with customer information collected on the merchant site.

### API Flow Overview - Redirect

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STANDARD CHECKOUT - REDIRECT FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Create Checkout                                                         │
│     LOCAL:    POST /api/afterpay/checkout                                   │
│     AFTERPAY: POST /v2/checkouts                                            │
│     DOCS:     .../checkouts/create-checkout-1                               │
│                                                                             │
│  2. Redirect Customer                                                       │
│     → redirectCheckoutUrl (Afterpay hosted page)                            │
│                                                                             │
│  3. Customer Returns                                                        │
│     ← orderToken in URL query parameter                                     │
│                                                                             │
│  4. Authorize Payment                                                       │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│     DOCS:     .../payments/auth                                             │
│                                                                             │
│  5. Capture Payment (if immediate mode)                                     │
│     LOCAL:    POST /api/afterpay/capture                                    │
│     AFTERPAY: POST /v2/payments/{orderId}/capture                           │
│     DOCS:     .../payments/capture-payment                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Checkout Method Options

#### 1. Redirect Flow

**What It Does:** Customer fills form on merchant site, then is redirected to Afterpay's full checkout page. After completion, they return to the review page.

**How to Test:**
1. Go to `/checkout`
2. Select **Standard Checkout** tab
3. Select **Redirect** method
4. Fill in customer details
5. Select shipping method
6. Click "Continue to Afterpay"
7. Complete checkout on Afterpay site
8. Return to review page (`/checkout/review`)
9. Click "Place Order"

**Technical Details:**

**API Flow:**
| Step | Local Endpoint | Afterpay API | Purpose |
|------|----------------|--------------|---------|
| 1 | `POST /api/afterpay/checkout` | `POST /v2/checkouts` | Create checkout, get `redirectCheckoutUrl` |
| 2 | Redirect | `redirectCheckoutUrl` | Customer completes on Afterpay |
| 3 | Return | URL params | Customer returns with `orderToken` |
| 4 | `POST /api/afterpay/auth` | `POST /v2/payments/auth` | Authorize payment |
| 5 | `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` | Capture (if immediate) |

**File:** `app/checkout/review/page.tsx`

<details>
<summary>✓ Verify Redirect Flow</summary>

- [ ] Form validation works
- [ ] Redirects to Afterpay
- [ ] Returns to review page
- [ ] Place Order works
- [ ] Confirmation displays

</details>

#### 2. Popup Flow

**What It Does:** Customer fills form on merchant site, Afterpay opens in a popup. Customer stays on merchant site throughout.

**How to Test:**
1. Go to `/checkout`
2. Select **Standard Checkout** tab
3. Select **Popup** method
4. Fill in customer details
5. Click "Continue to Afterpay"
6. Popup opens with Afterpay checkout
7. Complete in popup
8. Automatic redirect to confirmation

**Technical Details:**

**File:** `components/CheckoutStandard.tsx`

**Critical Implementation:**
```typescript
// MUST open popup synchronously in click handler to avoid blockers
window.Afterpay.initialize({ countryCode: 'US' });
window.Afterpay.open();  // Open immediately
window.Afterpay.onComplete = handleComplete;  // Set callback

// Later, after creating checkout:
window.Afterpay.transfer({ token: data.token });
```

**Important:** `popupOriginUrl` in the checkout request MUST match `window.location.origin` exactly (protocol + host + port), or the browser won't dispatch the `onComplete` event.

**Afterpay Documentation:** [Popup Method Reference](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method)

<details>
<summary>✓ Verify Popup Flow</summary>

- [ ] Popup opens (no blocker)
- [ ] Customer can complete in popup
- [ ] onComplete callback fires
- [ ] Redirects to confirmation

</details>

---

## Capture Modes

Toggle between authorization-only and immediate capture strategies.

### How to Toggle

1. Go to `/admin`
2. Find "Capture Mode" section at top
3. Click **Deferred** or **Immediate** button

### Deferred Capture Mode (Default)

**What It Does:** Only authorizes payment at checkout. Merchant captures later from Admin Panel.

**Use Cases:**
- Verify inventory before charging
- Ship-then-capture workflows
- Pre-orders

**Flow:**
1. Checkout completes with authorization only
2. Confirmation shows "Payment Authorized!" (blue)
3. Navigate to Admin Panel
4. Look up order by ID
5. Click "Capture Payment"
6. Enter amount and confirm

**API:**
| Step | Local Endpoint | Afterpay API |
|------|----------------|--------------|
| Auth | `POST /api/afterpay/auth` | `POST /v2/payments/auth` |
| Capture (later) | `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` |

### Immediate Capture Mode

**What It Does:** Fully captures payment when checkout completes.

**Use Cases:**
- Digital goods
- Instant fulfillment

**Flow:**
1. Checkout completes with full capture
2. Confirmation shows "Thank you for your order!" (green)
3. Payment already captured

**API:**
| Step | Local Endpoint | Afterpay API |
|------|----------------|--------------|
| Auth + Capture | `POST /api/afterpay/capture-full` | `POST /v2/payments/capture` |

**Technical Details:**

**Storage:** `localStorage.getItem('afterpay_capture_mode')`

**Values:** `'deferred'` or `'immediate'`

**Afterpay Documentation:** [Deferred Capture Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture)

<details>
<summary>✓ Verify Capture Modes</summary>

- [ ] Toggle persists in localStorage
- [ ] Deferred: Auth only, status = AUTHORIZED
- [ ] Immediate: Full capture, status = CAPTURED
- [ ] Confirmation message matches mode

</details>

---

# Part 3: Payment Operations

## Payment Admin Panel

Full payment management interface for post-checkout operations.

### URL: `/admin`

### Features Overview

| Feature | Description |
|---------|-------------|
| Merchant Configuration | View min/max order thresholds and currency |
| Payment Lookup | Search by Afterpay Order ID |
| Amount Breakdown | Visual display of captured/refunded/voided amounts |
| Actions | Capture, Refund, Void with partial amount support |
| Event History | Timeline of all payment events |
| Webhook Demo | Test webhook endpoint with simulated events |

### Merchant Configuration
- View merchant configuration (min/max order thresholds, currency)

### Payment Lookup
1. Enter Order ID (e.g., `100204123295`)
2. Click "Lookup"
3. View payment details, status, and history

### Amount Breakdown
Shows real-time calculation of:
- Original Amount
- Captured Amount
- Refunded Amount
- Voided Amount
- Open to Capture
- Available to Refund

### Actions

| Action | When Available | What It Does | Afterpay API |
|--------|----------------|--------------|--------------|
| Capture | Open to Capture > $0 | Captures authorized funds | `POST /v2/payments/{id}/capture` |
| Refund | Captured - Refunded > $0 | Returns funds to customer | `POST /v2/payments/{id}/refund` |
| Void | Open to Capture > $0 | Cancels authorization | `POST /v2/payments/{id}/void` |

**Partial Operations:** All actions support partial amounts. Enter specific amount or use the default (maximum).

### Event History
Unified timeline showing:
- `AUTH_APPROVED` - Authorization events
- `CAPTURED` - Capture events
- `REFUND` - Refund events
- `VOID` - Void events

### Technical Details

**Files:**
| File | Purpose |
|------|---------|
| `app/admin/page.tsx` | Admin UI |
| `app/api/afterpay/payment/[orderId]/route.ts` | Get payment details |
| `app/api/afterpay/capture/route.ts` | Capture payment |
| `app/api/afterpay/refund/route.ts` | Refund payment |
| `app/api/afterpay/void/route.ts` | Void payment |

**Payment State Calculation:**
```typescript
const getEffectiveStatus = () => {
  if (refunded >= captured) return 'FULLY REFUNDED';
  if (refunded > 0) return 'PARTIALLY REFUNDED';
  if (voided >= original) return 'VOIDED';
  if (captured > 0 && openToCapture <= 0) return 'CAPTURED';
  if (captured > 0) return 'PARTIALLY CAPTURED';
  if (status === 'APPROVED') return 'AUTHORIZED';
  return status;
};
```

<details>
<summary>✓ Verify Admin Panel</summary>

- [ ] Payment lookup works
- [ ] Status calculation correct
- [ ] Capture works (full and partial)
- [ ] Refund works (full and partial)
- [ ] Void works
- [ ] Event history displays correctly
- [ ] Optimistic updates work

</details>

---

## Webhook Handler

Test the webhook endpoint with simulated payment events to understand how merchants receive async notifications from Afterpay.

### Endpoint Info

**Local Endpoint:** `/api/webhooks/afterpay`

**Purpose:** Receive async payment notifications from Afterpay

### How to Test

1. Go to `/admin`
2. Click to expand the "Webhook Handler Demo" section
3. Click any event button to simulate receiving that webhook:
   - **PAYMENT_CAPTURED** - Payment was captured
   - **PAYMENT_AUTH_APPROVED** - Authorization approved
   - **REFUND_SUCCESS** - Refund completed
   - **PAYMENT_DECLINED** - Payment was declined
4. View the test event in "Recent Test Events" list
5. Check the Developer Panel for full request/response details

### Supported Events

| Event Type | Description |
|------------|-------------|
| `PAYMENT_CAPTURED` | Payment successfully captured |
| `PAYMENT_AUTH_APPROVED` | Authorization approved |
| `PAYMENT_DECLINED` | Payment declined |
| `PAYMENT_VOIDED` | Authorization voided |
| `REFUND_SUCCESS` | Refund processed successfully |
| `REFUND_FAILED` | Refund processing failed |

### Production Notes

- Configure this URL in your Afterpay merchant dashboard
- Verify signatures using HMAC-SHA256
- Respond with 200 status within 30 seconds

### Technical Details

**File:** `app/api/webhooks/afterpay/route.ts`

**Afterpay Documentation:** [Webhook Events](https://developers.cash.app/cash-app-afterpay/guides/api-development/webhook-signature-generation)

---

## Order History

Track all completed orders with persistent storage and easy management.

### URL: `/orders`

### Features

| Feature | Description |
|---------|-------------|
| Order List | View all completed orders with status badges |
| Order Details | Items, totals, checkout flow used, timestamps |
| Individual Deletion | Remove specific orders from history |
| Clear All | Remove all orders at once |
| Admin Links | Direct links to Admin Panel for order management |
| Persistence | Orders saved to localStorage (last 20 orders) |

### How to Use

#### Viewing Orders
1. Navigate to `/orders` or click "Orders" in the navigation
2. View list of completed orders with status badges
3. Click an order to expand and see details

#### Deleting Individual Orders
1. Click on an order to expand it
2. Click the trash icon next to the order
3. Order is removed from history

#### Clearing All Orders
1. Click "Clear All" button at the top
2. All orders are removed from localStorage

#### Managing Orders in Admin
1. Click "Manage in Admin" link on any order
2. Opens Admin Panel with Order ID pre-filled
3. Capture, refund, or void the payment

### Cart Clearing Behavior

| Event | Cart Cleared? |
|-------|---------------|
| Checkout started | No |
| Popup opened | No |
| Popup cancelled | No |
| Payment declined | No |
| Payment authorized | **Yes** |
| Payment captured | Already cleared |

This ensures customers don't lose their cart if checkout is interrupted.

### Technical Details

**Files:**
- `app/orders/page.tsx` - Order history UI
- `lib/orders.ts` - Order persistence utilities

**Storage:**
```typescript
const ORDERS_STORAGE_KEY = 'afterpay-demo-orders';
const MAX_ORDERS = 20;

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderId: string;           // Afterpay order ID
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'voided';
  total: number;
  items: OrderItem[];
  createdAt: string;
  flow: string;              // e.g., 'express-integrated', 'standard-redirect'
  captureMode: 'deferred' | 'immediate';
}
```

<details>
<summary>✓ Verify Order History</summary>

- [ ] Orders page accessible from navigation
- [ ] Completed orders display with status badges
- [ ] Order details expand on click
- [ ] Individual orders can be deleted
- [ ] Clear All removes all orders
- [ ] Orders persist after page refresh
- [ ] Admin links navigate to Admin Panel

</details>

---

# Part 4: API Reference

## Local to Afterpay API Mapping

| Local Endpoint | Method | Afterpay API | Purpose | Docs |
|----------------|--------|--------------|---------|------|
| `/api/afterpay/checkout` | POST | `POST /v2/checkouts` | Create checkout session | [Create Checkout](https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1) |
| `/api/afterpay/auth` | POST | `POST /v2/payments/auth` | Authorize payment | [Authorise Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth) |
| `/api/afterpay/capture` | POST | `POST /v2/payments/{id}/capture` | Capture (partial) | [Capture Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |
| `/api/afterpay/capture-full` | POST | `POST /v2/payments/capture` | Capture (full) | [Capture Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |
| `/api/afterpay/refund` | POST | `POST /v2/payments/{id}/refund` | Process refund | [Create Refund](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund) |
| `/api/afterpay/void` | POST | `POST /v2/payments/{id}/void` | Void authorization | [Void Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment) |
| `/api/afterpay/payment/[id]` | GET | `GET /v2/payments/{id}` | Get payment details | [Get Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id) |
| `/api/afterpay/configuration` | POST | `GET /v2/configuration` | Get merchant config | [Get Configuration](https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration) |
| `/api/webhooks/afterpay` | POST | - | Receive webhook events | [Webhooks](https://developers.cash.app/cash-app-afterpay/guides/api-development/webhook-signature-generation) |

**Sandbox Base URL:** `https://global-api-sandbox.afterpay.com`

---

## Idempotency with requestId

All payment operations (auth, capture, refund, void) include a `requestId` parameter for idempotent requests. This enables safe retries on timeout or network failures.

**How it works:**
1. Each request generates a unique UUID (`crypto.randomUUID()`)
2. The `requestId` is included in the request body to Afterpay
3. If a request times out, retry with the **same** `requestId`
4. Afterpay recognizes the duplicate and returns the original response

**Example - Safe Retry Pattern:**

```typescript
const requestId = crypto.randomUUID();

async function captureWithRetry(orderId: string, amount: number, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/afterpay/capture', {
        method: 'POST',
        body: JSON.stringify({ orderId, amount, currency: 'USD' })
      });
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
    }
  }
}
```

**Developer Panel:**
The Request ID is displayed in the Developer Panel when you expand an event, making it easy to debug and verify idempotency.

**Reference Documentation:**
- [Auth requestId](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth#request.body.requestid)
- [Capture requestId](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment#request.body.requestId)
- [Refund requestId](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund#request.body.requestId)
- [Void requestId](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment)

---

## API Flow Diagrams

### Express Checkout Flow

```
Customer clicks "Pay with Afterpay"
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/afterpay/checkout         │
│ → Afterpay: POST /v2/checkouts      │
│ ← Returns: token                    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ AfterPay.open() - Popup opens       │
│ Customer completes in popup         │
│ ← Returns: orderToken via callback  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/afterpay/auth             │
│ → Afterpay: POST /v2/payments/auth  │
│ ← Returns: orderId, status          │
└─────────────────────────────────────┘
         │
         ▼ (if immediate capture)
┌─────────────────────────────────────┐
│ POST /api/afterpay/capture-full     │
│ → Afterpay: POST /v2/payments/capture│
│ ← Returns: captured amount          │
└─────────────────────────────────────┘
```

### Standard Checkout - Redirect Flow

```
Customer fills form, clicks "Continue to Afterpay"
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/afterpay/checkout         │
│ → Afterpay: POST /v2/checkouts      │
│ ← Returns: redirectCheckoutUrl      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Redirect to Afterpay                │
│ Customer completes checkout         │
│ Redirect back with ?orderToken=xxx  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/afterpay/auth             │
│ → Afterpay: POST /v2/payments/auth  │
│ ← Returns: orderId, status          │
└─────────────────────────────────────┘
         │
         ▼ (if immediate capture)
┌─────────────────────────────────────┐
│ POST /api/afterpay/capture          │
│ → Afterpay: POST /v2/payments/{id}/capture │
│ ← Returns: captured amount          │
└─────────────────────────────────────┘
```

### Capture / Refund / Void Flow

```
┌─────────────────────────────────────┐
│ CAPTURE                             │
│ POST /api/afterpay/capture          │
│ → Afterpay: POST /v2/payments/{id}/capture │
│ Body: { amount, orderId }           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ REFUND                              │
│ POST /api/afterpay/refund           │
│ → Afterpay: POST /v2/payments/{id}/refund │
│ Body: { amount, orderId }           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ VOID                                │
│ POST /api/afterpay/void             │
│ → Afterpay: POST /v2/payments/{id}/void │
│ Body: { orderId }                   │
└─────────────────────────────────────┘
```

---

## Test Credentials

### Sandbox Test Account

You can create test customer accounts in the sandbox environment within your test checkout flow:

- **Email**: Use any unique email address
- **Phone**: Use any phone number
- **Verification Code**: Use `111111` (no SMS messages are sent in sandbox)

### Test Credit Cards

| CVV | Result |
|-----|--------|
| `000` | Approved |
| `051` | Declined |

See [Test Environments](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#test-credit-cards) for complete test card documentation.

---

## Troubleshooting

### Popup Flow Shows "Cancelled"
**Cause:** `popupOriginUrl` mismatch

**Fix:** Ensure `NEXT_PUBLIC_APP_URL` in `.env.local` exactly matches where app is running (e.g., `http://localhost:3000`)

### OSM Not Displaying
**Cause:** Invalid placement IDs or MPID

**Fix:** Verify OSM environment variables are correctly set

### Widget Not Loading (Deferred Shipping)
**Cause:** Afterpay.js not loaded

**Fix:** Check that Afterpay.js script is included in layout

### Capture Fails with "Already Captured"
**Cause:** Payment was already captured

**Fix:** Refresh payment details in Admin Panel

### Refund Exceeds Available Amount
**Cause:** Refund amount > (Captured - Already Refunded)

**Fix:** Check "Available to Refund" amount in Admin Panel

---

# Part 5: Developer Tools

## Developer Panel

### What It Does
A comprehensive API inspection tool that displays real-time API requests and responses during checkout flows.

**Default State:** The panel starts **collapsed by default**. Click the panel header to expand and view logs.

### Where to Find
- Bottom of checkout pages (fixed panel)
- Confirmation page (full timeline)
- Admin panel (during operations)

### Information Shown
- Request method and endpoint
- **Full API URL** (e.g., `https://global-api-sandbox.afterpay.com/v2/checkouts`)
- **Path parameters** (for endpoints like `/v2/payments/{orderId}/capture`)
- **Request headers** (Content-Type, Authorization masked as "Basic ***", User-Agent)
- **Full server-side request body** - Shows exactly what's sent to Afterpay APIs, including:
  - `merchantReference` (generated server-side, e.g., "ORD-ABC123-XYZ")
  - `merchant` object with `redirectConfirmUrl`, `redirectCancelUrl`, `popupOriginUrl`
  - Full `amount` objects with currency
  - Transformed item data
- Request body with size indicator (e.g., "1.2 KB")
- HTTP status code (color-coded: green for success, red for errors)
- **API Status** (extracted from response: APPROVED, DECLINED, CAPTURED, etc.)
- **Error messages** (prominently displayed when present)
- Response body with size indicator
- Duration (ms)
- **Documentation links** (click "Docs" to view Afterpay API reference)

### Panel Features

#### Resizable Panel
- **Drag to resize**: Hover over the top edge of the panel to see the resize grip
- **Drag up/down** to increase or decrease panel height
- **Height persists**: Your preferred height is saved to localStorage
- **Min/Max limits**: Minimum 200px, maximum 80% of viewport height

#### Display Order
- Events display in **reverse-chronological order** (most recent first)
- Click any log entry to view full details

#### Filter & Search
- **Filter chips**: All, Requests, Responses, Events, Redirects
- **Search box**: Search across labels, endpoints, and data content
- Shows filtered count (e.g., "3/10 events")

#### Collapsible Sections
- **Headers**: View request headers (collapsed by default)
- **Request Body**: View full JSON payload with size indicator
- **Response Body**: View full JSON response with size indicator

#### Copy as cURL
- Click the **cURL** button in the detail view
- Generates executable cURL command with:
  - HTTP method
  - Full URL
  - Headers (Authorization as placeholder)
  - Request body
- Copies to clipboard with "Copied!" confirmation

#### Export Logs
- Click **Export** dropdown in panel header
- **Export as JSON**: Download full flow logs as formatted JSON file
- **Export as HAR**: Download in HTTP Archive format for import into browser DevTools

<details>
<summary>✓ Verify Developer Panel</summary>

- [ ] Flow logs capture all API calls
- [ ] Events display in reverse-chronological order (most recent first)
- [ ] Logs expandable with details
- [ ] Full URL displayed for each API call
- [ ] Headers section shows Content-Type, Authorization (masked)
- [ ] Request/response body sections are collapsible
- [ ] Size indicators show payload sizes
- [ ] API status badges display correctly
- [ ] Documentation links open correct pages
- [ ] Filter chips work (All, Requests, Responses, Events, Redirects)
- [ ] Search filters results correctly
- [ ] Copy as cURL generates valid command
- [ ] Export as JSON downloads properly formatted file
- [ ] Export as HAR downloads valid HAR file

</details>

---

## Integration Flow Summary

### What It Does
Displays a summary panel on the confirmation page showing the key configuration and response data from your completed checkout flow.

### Where to Find
- Confirmation page (`/confirmation`) - appears in the Integration Flow section, above the timeline

### Information Displayed

| Panel | Contents |
|-------|----------|
| Summary | Flow description, steps executed, link to Afterpay docs |
| Request Configuration | Key parameters sent to Afterpay (mode, URLs, checksums) |
| Checkout Adjustment | Original → adjusted amounts (deferred shipping only) |
| Response Data | Token, order ID, status, amounts from API responses |

### How to Use

1. Complete any checkout flow
2. On the confirmation page, scroll to "Integration Flow"
3. View the summary panels above the timeline
4. Click parameter names to view Afterpay documentation
5. Use "Copy All" to export flow data as JSON

### Copy Button Output

The copy button generates JSON with a disclaimer:

```json
{
  "_disclaimer": "This is a summary of core integration flow data, not an actual Afterpay API response. For raw API requests and responses, expand the timeline entries below.",
  "flow": "express-deferred",
  "description": "...",
  "steps": ["Create Checkout", "Afterpay Popup", "Select Shipping", "Authorize"],
  "requestConfig": { ... },
  "adjustment": { ... },
  "responseData": { ... }
}
```

### Flow-Specific Information

| Flow | Request Config Shown | Special Panels |
|------|---------------------|----------------|
| Express Integrated | mode, popupOriginUrl | - |
| Express Deferred | mode, popupOriginUrl, isCheckoutAdjusted, checksum | Checkout Adjustment |
| Standard Redirect | redirectConfirmUrl, redirectCancelUrl | - |
| Standard Popup | popupOriginUrl, redirectConfirmUrl | - |

<details>
<summary>✓ Verify Integration Flow Summary</summary>

- [ ] Summary panel displays on confirmation page
- [ ] Flow description matches checkout type used
- [ ] Steps show correct sequence
- [ ] Request config shows relevant parameters
- [ ] Checkout adjustment appears for deferred shipping only
- [ ] Response data shows token, ID, status
- [ ] Doc links open correct Afterpay pages
- [ ] Copy button copies JSON with disclaimer

</details>

---

## Code Viewer

### What It Does
Shows implementation code for current checkout method.

### Where to Find
- Bottom of Express Checkout section
- Bottom of Standard Checkout section

### Features
- Syntax-highlighted code
- Copy to clipboard
- Updates when switching methods

### Technical Files

| Feature | File |
|---------|------|
| Flow Logs | `lib/flowLogs.ts` |
| Developer Panel | `components/FlowLogsDevPanel.tsx` |
| Code Viewer | `components/CodeViewer.tsx` |
| API Routes (with metadata) | `app/api/afterpay/*` |

<details>
<summary>✓ Verify Code Viewer</summary>

- [ ] Code viewer displays correct code
- [ ] Code updates per checkout method
- [ ] Copy to clipboard works

</details>

---

# Part 6: App Customization

## Settings & Preferences

### Dark Mode

The demo includes full dark mode support with system preference detection.

#### How to Toggle

1. Click "Dark Mode" or "Light Mode" in the header navigation
2. Theme switches immediately
3. Preference is saved to localStorage

#### Features

| Feature | Description |
|---------|-------------|
| System Detection | Automatically matches OS preference on first visit |
| Manual Toggle | Click "Dark Mode" to switch to dark theme, "Light Mode" to switch to light theme |
| Persistence | Preference saved to localStorage |
| Mint Accent | Brand colors preserved in dark theme |

#### Technical Details

**Component:** `components/ThemeProvider.tsx`

**Implementation:**
```tsx
// Theme context provides current theme and setter
const { theme, resolvedTheme, setTheme } = useTheme();

// Toggle between light and dark
const toggleTheme = () => {
  setTheme(resolvedTheme === "dark" ? "light" : "dark");
};
```

**Tailwind Configuration:**
```typescript
// tailwind.config.ts
{
  darkMode: "class",  // Uses .dark class on <html>
}
```

**CSS Classes:**
- Light: Default styles
- Dark: Add `dark:` prefix (e.g., `dark:bg-afterpay-gray-900`)

#### Supported Components

| Component | Dark Mode Support |
|-----------|-------------------|
| Header | Glass effect, nav links, toggle button |
| Product Cards | Background, text, borders |
| Form Inputs | Background, borders, text |
| Checkout Pages | Background, cards |

<details>
<summary>✓ Verify Dark Mode</summary>

- [ ] Toggle visible in header
- [ ] Click toggles between light/dark
- [ ] System preference detected on first load
- [ ] Preference persists after refresh
- [ ] Product cards display correctly in dark mode
- [ ] Form inputs readable in dark mode
- [ ] Header glass effect works in dark mode

</details>

---

## Navigation

The demo features a redesigned header with grouped navigation and a mobile-friendly slide-out menu.

### Desktop Navigation

Navigation items are organized into two logical groups:

| Group | Items | Purpose |
|-------|-------|---------|
| **Demo** | Shop, Checkout | Core shopping experience |
| **Tools** | Admin, Orders, Docs | Developer and management tools |

### Mobile Navigation

On mobile devices (< 768px), the navigation collapses into a hamburger menu:

1. Click the hamburger icon in the top-right
2. Slide-out drawer appears from the right
3. Navigation items shown in grouped sections
4. Click outside or the × button to close

### Active State Indicators

- Current page is highlighted with mint accent color
- Active nav items have a subtle mint background
- Hover states provide visual feedback

### Technical Details

**Component:** `components/Header.tsx`

**Implementation:**
```tsx
const demoNav = [
  { href: "/", label: "Shop" },
  { href: "/checkout", label: "Checkout" },
];
const toolsNav = [
  { href: "/admin", label: "Admin" },
  { href: "/orders", label: "Orders" },
  { href: "/docs", label: "Docs" },
];

// Active state detection
const isActive = (href: string) => {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
};
```

### Features

| Feature | Description |
|---------|-------------|
| Grouped Navigation | Logical separation of demo vs tools |
| Mobile Menu | Slide-out drawer on small screens |
| Active Indicators | Mint highlight on current page |
| Glass Effect | Backdrop blur on scroll (dark mode) |
| Official Branding | Cash App Afterpay logo from CDN |

<details>
<summary>✓ Verify Navigation</summary>

- [ ] Desktop shows grouped navigation (Demo | Tools)
- [ ] Active page highlighted with mint accent
- [ ] Mobile hamburger menu visible on small screens
- [ ] Mobile menu slides in from right
- [ ] Navigation items grouped in mobile menu
- [ ] Official Afterpay logo displays correctly

</details>

---

## Design System

The demo features a polished UI with distinctive styling built on Afterpay's brand identity.

### Typography

| Font | Usage | Source |
|------|-------|--------|
| Outfit | Headings, titles, prices | Google Fonts |
| Plus Jakarta Sans | Body text, descriptions | Google Fonts |

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Afterpay Mint | `#B2FCE4` | Primary CTAs, accents, highlights |
| Mint Dark | `#8EEBC8` | Hover states |
| Mint Light | `#D4FEF0` | Subtle backgrounds, gradients |

### Product Images

All product images are sourced from Unsplash and optimized via Next.js Image component:
- Automatic format selection (WebP where supported)
- Responsive sizing with `sizes` attribute
- Lazy loading with blur placeholder support

### Button Styles

Three button variants available via CSS utility classes:

```css
.btn-primary   /* Mint background, black text, shadow */
.btn-secondary /* Black background, white text */
.btn-outline   /* Transparent with black border */
```

### Form Styles

Styled form elements with mint accents:

```css
.input-styled   /* Text inputs with gray bg, mint focus ring */
.checkbox-mint  /* Custom checkbox with mint accent */
.radio-mint     /* Custom radio with mint accent */
.select-styled  /* Dropdown with custom arrow */
```

### Animation Effects

| Effect | Class | Usage |
|--------|-------|-------|
| Fade In Up | `animate-fade-in-up` | Hero text, page elements |
| Card Hover | `hover-lift` | Product cards, info cards |
| Mint Glow | `shadow-mint-glow` | Logo, featured elements |
| Bounce Small | `animate-bounce-sm` | Cart icon on add |
| Slide In Right | `animate-slide-in-right` | Tab indicators |

### Animation Delays

Staggered animation delays for sequenced reveals:

```css
.animate-delay-100  /* 100ms delay */
.animate-delay-200  /* 200ms delay */
.animate-delay-300  /* 300ms delay */
.animate-delay-400  /* 400ms delay */
.animate-delay-500  /* 500ms delay */
```

### Technical Files

| Feature | File |
|---------|------|
| Tailwind Config | `tailwind.config.ts` |
| Global Styles | `app/globals.css` |
| Font Loading | `app/layout.tsx` |
| Theme Provider | `components/ThemeProvider.tsx` |

---

## UI Components

### Checkout Progress Timeline

Visual stepper showing checkout flow progress.

**Where to Find:** Top of checkout, shipping, review, and confirmation pages

**Steps Shown:**
- Cart
- Checkout
- Shipping (deferred shipping flow only)
- Review (standard checkout only)
- Confirm

**Features:**
- Completed steps show checkmark with mint background
- Current step has ring highlight
- Connector lines animate as steps complete

**Technical Details:**

**Component:** `components/CheckoutProgress.tsx`

```tsx
<CheckoutProgress
  currentStep="checkout"
  showShipping={false}  // Show shipping step?
  showReview={false}    // Show review step?
/>
```

### Loading States

#### Product Grid Skeleton

Shows animated placeholder cards while products load.

**Component:** `components/ProductGrid.tsx`

```tsx
<ProductGrid products={[]} loading={true} />
```

#### Loading Spinner

Mint-colored spinner for API operations.

**Component:** `components/LoadingSpinner.tsx`

```tsx
<LoadingSpinner size="sm" />  // 16px
<LoadingSpinner size="md" />  // 24px (default)
<LoadingSpinner size="lg" />  // 32px
```

### Micro-interactions

#### Cart Bounce Animation

Cart icon badge bounces when items are added.

**How It Works:**
1. `CartProvider` increments `cartAnimationTrigger` on `addToCart`
2. `Header` listens to trigger and applies `animate-bounce-sm` class
3. Animation resets after 300ms

**Files:**
- `components/CartProvider.tsx` - Animation trigger state
- `components/Header.tsx` - Animation application

#### Tab Slide Indicator

Checkout method tabs have sliding indicator.

**How It Works:**
- Single indicator element positioned absolutely
- CSS transform animates position based on selected tab
- 300ms ease-out transition

**File:** `app/checkout/page.tsx`

### Form Input Styling

All form inputs use consistent mint-accented styling.

**CSS Classes:**

| Class | Usage |
|-------|-------|
| `input-styled` | Text inputs, textareas |
| `checkbox-mint` | Checkboxes |
| `radio-mint` | Radio buttons |
| `select-styled` | Select dropdowns |

**Features:**
- Gray-50 background (dark: gray-800)
- Mint focus ring
- Smooth transitions
- Dark mode support

**File:** `app/globals.css`

### Admin Amount Visualization

Visual progress bar showing payment amount breakdown.

**Location:** Admin Panel → Amount Breakdown section

**Segments:**
- Green: Captured amount
- Blue: Open to capture
- Orange: Refunded amount
- Red: Voided amount

**Features:**
- Hover tooltips show exact amounts
- Legend below bar
- Animated transitions on state change
- Gradient header styling

**File:** `app/admin/page.tsx`

<details>
<summary>✓ Verify UI Components</summary>

- [ ] Checkout progress timeline shows on checkout pages
- [ ] Completed steps show checkmarks
- [ ] Current step is highlighted
- [ ] Cart icon bounces when adding items
- [ ] Tab indicator slides between Express/Standard
- [ ] Product skeleton shows when loading
- [ ] Mint spinners display during API calls
- [ ] Admin progress bar shows amount breakdown
- [ ] Form inputs have mint focus rings

</details>

---

## In-App Documentation

Access project documentation directly within the app with a premium reading experience.

### URL: `/docs`

### Features

| Feature | Description |
|---------|-------------|
| Tabbed Interface | Switch between README and How-to-Use Guide |
| Table of Contents | Auto-generated sidebar navigation from headings |
| Section Highlighting | Active section tracked as you scroll |
| Quick Links | Fast access to Checkout Demo, Admin Panel, API Docs |
| Premium Typography | Custom markdown rendering with elegant styling |
| Dark Mode | Full dark mode support throughout |
| Mobile Responsive | Collapsible TOC sidebar on mobile devices |

### How to Use

#### Navigating Documentation
1. Go to `/docs` or click "Docs" in the navigation
2. Select "README" or "How to Use" tab
3. Use the sidebar to jump to specific sections
4. Current section highlights as you scroll

#### Using Quick Links
The header includes quick access links:
- **Checkout Demo** → `/checkout`
- **Admin Panel** → `/admin`
- **API Docs** → External Afterpay API documentation

#### Mobile Navigation
On mobile devices:
1. Tap the menu icon to open the TOC sidebar
2. Tap a section to navigate
3. Sidebar closes automatically after selection

### Technical Details

**Files:**
- `app/docs/page.tsx` - Documentation viewer UI
- `app/api/docs/readme/route.ts` - Serves README.md content
- `app/api/docs/how-to-use/route.ts` - Serves how-to-use.md content

**Table of Contents Extraction:**
```typescript
function extractHeadings(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  // Extracts h1, h2, h3 headings
  // Generates IDs from heading text
  // Returns array of { id, text, level }
}
```

**Section Highlighting:**
- Uses scroll event listener
- Checks heading positions relative to viewport
- Highlights the heading closest to top of screen

**Custom Markdown Components:**
- Premium styling for headings, paragraphs, lists
- Syntax highlighting for code blocks
- Styled tables with borders and zebra striping
- Blockquotes with mint accent border

<details>
<summary>✓ Verify In-App Documentation</summary>

- [ ] Docs page accessible from navigation
- [ ] README tab loads and displays correctly
- [ ] How-to-Use tab loads and displays correctly
- [ ] Table of contents generates from headings
- [ ] Clicking TOC item scrolls to section
- [ ] Active section highlights in TOC on scroll
- [ ] Quick links navigate to correct pages
- [ ] Dark mode displays correctly
- [ ] Mobile TOC sidebar works

</details>

---

## Afterpay Resources

### Documentation Links

| Topic | URL |
|-------|-----|
| Getting Started | https://developers.cash.app/cash-app-afterpay/guides/welcome/getting-started |
| Express Checkout | https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout |
| On-Site Messaging | https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging |
| Test Environments | https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments |
| API Reference | https://developers.cash.app/cash-app-afterpay/api-reference |

### API Endpoint Reference

| Endpoint | Documentation |
|----------|---------------|
| Create Checkout | https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1 |
| Authorise Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth |
| Capture Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment |
| Create Refund | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund |
| Void Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment |
| Get Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id |
| Get Configuration | https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration |

---

## Changelog

### February 2026

#### v2.5.0 - Dark Mode & OSM Improvements
- **OSM Dark Mode Support**: Added light background containers for OSM widget in dark mode to ensure proper widget visibility and accurate payment calculations
- **Flow Log Deduplication**: Implemented duplicate detection in `addFlowLog()` to prevent repeated entries within 2-second window
- **Checkout Review Messaging**: Changed "Payment Confirmed" to "Ready to Complete" with capture-mode-aware messaging
- **Official Afterpay Logos**: Replaced custom text badges with official Cash App Afterpay color logos throughout

#### v2.4.0 - Documentation & Navigation
- **User Guide**: Comprehensive documentation restructure with table of contents
- **Navigation Redesign**: Centered nav with grouped sections (Demo | Tools), text labels for Dark Mode and Cart
- **Header Cleanup**: Renamed "Docs" to "User Guide", fixed label wrapping

#### v2.3.0 - Developer Tools
- **Integration Flow Summary**: Added summary panel on confirmation page showing request config and response data
- **Developer Panel Enhancements**:
  - Resizable panel with persistent height
  - Copy as cURL functionality
  - Export as JSON/HAR
  - Filter chips and search
  - Reverse-chronological display order

#### v2.2.0 - Payment Operations
- **Webhook Handler Demo**: Interactive webhook testing in Admin Panel
- **Order History**: Persistent order tracking with individual deletion
- **Admin Panel**: Full payment management with capture, refund, void operations

#### v2.1.0 - Checkout Features
- **Express Checkout**: Integrated and deferred shipping flows
- **Standard Checkout**: Redirect and popup methods
- **Capture Modes**: Toggle between deferred and immediate capture

#### v2.0.0 - Initial Release
- Core shopping experience with product catalog and cart
- On-Site Messaging (OSM) integration
- Dark mode with system preference detection
- Mobile-responsive design
