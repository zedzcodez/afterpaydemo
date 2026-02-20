# How to Use This Demo

This guide walks you through testing all features of the Afterpay Demo Shop, with explanations of the technical implementation details you can review.

---

## At a Glance

### Shopping Experience
| Feature | What It Does | Where | Afterpay Docs |
|---------|--------------|-------|---------------|
| On-Site Messaging | "Pay in 4" or "Pay Monthly" badges | `/products/1`, `/cart` | [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging) |
| Buy Now (Express) | Popup checkout from product/cart pages | Product pages, Cart, Mini-cart | [Express Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout) |

### Checkout
| Feature | What It Does | Where | Afterpay Docs |
|---------|--------------|-------|---------------|
| Standard Checkout | Redirect or popup to Afterpay | `/checkout` | [API Quickstart](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart) |
| Cash App Pay | QR code (desktop) or Cash App redirect (mobile) | `/checkout` | [Cash App Pay Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview) |

### Payment Operations
| Feature | What It Does | Where | Afterpay Docs |
|---------|--------------|-------|---------------|
| Deferred Capture | Authorize now, capture later | `/admin` | [Deferred Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture) |
| Immediate Capture | Authorize and capture in a single step | `/admin` | [Immediate Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/immediate-capture) |
| Refunds & Voids | Full/partial refunds and void authorization | `/admin` | [Payments API](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments) |
| Order History | Track completed orders | `/orders` | - |

### Admin & Developer
| Feature | What It Does | Where | Afterpay Docs |
|---------|--------------|-------|---------------|
| Admin Configuration | Toggle checkout features and developer mode | `/admin` | - |

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
2. [On-Site Messaging](#on-site-messaging)
3. [Express Checkout](#express-checkout)
4. [Standard Checkout](#standard-checkout)
5. [Cash App Pay](#cash-app-pay)
6. [Capture Modes](#capture-modes)

### Part 3: Payment Operations
7. [Payment Admin Panel](#payment-admin-panel)
8. [Order History](#order-history)

### Part 4: API Reference
9. [Local to Afterpay API Mapping](#local-to-afterpay-api-mapping)
10. [Idempotency with requestId](#idempotency-with-requestid)
11. [API Flow Diagrams](#api-flow-diagrams)
12. [Test Credentials](#test-credentials)
13. [FAQ](#faq)

### Part 5: Developer Tools
14. [Developer Panel](#developer-panel)
15. [Integration Flow Summary](#integration-flow-summary)
16. [Code Viewer](#code-viewer)

### Part 6: Reference
17. [Dark Mode](#dark-mode)
18. [Afterpay Resources](#afterpay-resources)
19. [Changelog](#changelog)

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

## On-Site Messaging

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

**Afterpay Documentation:** [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging)

<details>
<summary>✓ Verify This Feature</summary>

- [ ] On-Site Messaging displays on product pages
- [ ] On-Site Messaging displays on cart page
- [ ] On-Site Messaging displays on checkout page
- [ ] Amount updates when cart changes
- [ ] Info modal opens on click

</details>

---

## Express Checkout

Express Checkout uses Afterpay.js to provide a streamlined popup-based checkout experience. In v3.0, Express Checkout is accessed via inline **Buy Now** buttons located on product pages, the cart, and the mini-cart dropdown -- rather than a tab on the checkout page.

### Where to Find Buy Now Buttons

| Location | What It Buys | URL |
|----------|-------------|-----|
| Product detail page | Single item | `/products/{id}` |
| Product grid cards | Single item (compact button) | `/` |
| Cart page | Full cart | `/cart` |
| Mini-cart dropdown | Full cart | Header cart icon |

> **Note:** Buy Now buttons are only visible when Express Checkout is enabled in Admin Configuration (`/admin` > Configuration tab).

### API Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPRESS CHECKOUT FLOW (Buy Now)                                             │
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
│  5. Process Payment (depends on capture mode)                               │
│                                                                             │
│     IMMEDIATE CAPTURE (single step):                                        │
│     LOCAL:    POST /api/afterpay/capture-full                               │
│     AFTERPAY: POST /v2/payments/capture                                     │
│     → Auth + capture combined, status = CAPTURED                            │
│                                                                             │
│     DEFERRED CAPTURE (auth only):                                           │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│     → Auth only, capture later from Admin Panel                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How to Test

1. Enable Express Checkout in Admin Configuration (`/admin` > Configuration tab)
2. Navigate to any product page, cart, or use the mini-cart dropdown
3. Click the **"Buy Now"** button (mint-colored, shows Afterpay logo)
4. Express popup opens
5. Complete checkout in popup
6. Redirected to confirmation page

### Shipping Flow Options

The shipping type (Integrated or Deferred) is configured in Admin Configuration (`/admin` > Configuration tab > Express Checkout section).

#### 1. Integrated Shipping

**What It Does:** Customer selects shipping options directly within the Afterpay popup.

**How to Test:**
1. In Admin Configuration, set Express Checkout shipping type to **Integrated**
2. Navigate to any product page, cart, or mini-cart
3. Click **"Buy Now"**
4. In the popup, enter address
5. Select from shipping options provided
6. Complete checkout
7. View confirmation page

**Technical Details:**

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

- [ ] Buy Now button visible when Express Checkout enabled
- [ ] Popup opens correctly from product page
- [ ] Popup opens correctly from cart page
- [ ] Popup opens correctly from mini-cart
- [ ] Shipping options display in popup
- [ ] Shipping selection updates total
- [ ] Checkout completes successfully
- [ ] Confirmation page displays

</details>

#### 2. Deferred Shipping

**What It Does:** Customer confirms address in Afterpay popup, then returns to merchant site to select shipping. Requires displaying the Payment Schedule Widget.

**How to Test:**
1. In Admin Configuration, set Express Checkout shipping type to **Deferred**
2. Navigate to any product page, cart, or mini-cart
3. Click **"Buy Now"**
4. Complete popup (no shipping selection)
5. Return to shipping page (`/checkout/shipping`)
6. Select shipping option (widget updates)
7. Click "Place Order"

**Technical Details:**

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

Standard Checkout uses server-side API calls with customer information collected on the merchant site. In v3.0, Standard Checkout is the default (and primary) form on the `/checkout` page. The checkout method (Popup or Redirect) is configured in Admin Configuration, and the submit button is the official branded "Pay with Afterpay" SVG button.

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
│  4. Process Payment (depends on capture mode)                               │
│                                                                             │
│     IMMEDIATE CAPTURE (single step):                                        │
│     LOCAL:    POST /api/afterpay/capture-full                               │
│     AFTERPAY: POST /v2/payments/capture                                     │
│     → Auth + capture combined, status = CAPTURED                            │
│                                                                             │
│     DEFERRED CAPTURE (auth only):                                           │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│     → Auth only, capture later from Admin Panel                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Checkout Method Options

#### 1. Redirect Flow

**What It Does:** Customer fills form on merchant site, then is redirected to Afterpay's full checkout page. After completion, they return to the review page.

**How to Test:**
1. In Admin Configuration (`/admin`), set Standard Checkout method to **Redirect**
2. Go to `/checkout` (Standard Checkout is the default form)
3. Fill in customer details
4. Select shipping method
5. Click the **"Pay with Afterpay"** branded SVG button
6. Complete checkout on Afterpay site
7. Return to review page (`/checkout/review`)
8. Click "Place Order"

**Technical Details:**

**API Flow:**
| Step | Local Endpoint | Afterpay API | Purpose |
|------|----------------|--------------|---------|
| 1 | `POST /api/afterpay/checkout` | `POST /v2/checkouts` | Create checkout, get `redirectCheckoutUrl` |
| 2 | Redirect | `redirectCheckoutUrl` | Customer completes on Afterpay |
| 3 | Return | URL params | Customer returns with `orderToken` |
| 4 | `POST /api/afterpay/auth` | `POST /v2/payments/auth` | Authorize payment |
| 5 | `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` | Capture (if immediate) |

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
1. In Admin Configuration (`/admin`), set Standard Checkout method to **Popup**
2. Go to `/checkout` (Standard Checkout is the default form)
3. Fill in customer details
4. Click the **"Pay with Afterpay"** branded SVG button
5. Popup opens with Afterpay checkout
6. Complete in popup
7. Automatic redirect to confirmation

**Technical Details:**

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

## Cash App Pay

Cash App Pay lets customers pay now using their Cash App account. On desktop, a QR code is displayed for scanning. On mobile, customers are redirected to the Cash App.

> **Note:** The Cash App Pay tab only appears on the checkout page when Cash App Pay is enabled in Admin Configuration (`/admin` > Configuration tab). If disabled, the checkout page shows only the Standard Checkout form with no tabs.

### API Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CASH APP PAY FLOW                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Collect Customer Details                                                │
│     Merchant site form (email, name, address, shipping)                     │
│                                                                             │
│  2. Create Checkout                                                         │
│     LOCAL:    POST /api/afterpay/checkout  { isCashAppPay: true }           │
│     AFTERPAY: POST /v2/checkouts                                            │
│                                                                             │
│  3. Initialize Cash App Pay SDK                                             │
│     renderCashAppPayButton() → initializeForCashAppPay()                    │
│                                                                             │
│  4. Customer Pays                                                           │
│     Desktop: Scan QR code with Cash App                                     │
│     Mobile:  Redirect to Cash App → return via redirect URL                 │
│                                                                             │
│  5. onComplete Callback                                                     │
│     → Returns orderToken, status, cashtag                                   │
│                                                                             │
│  6. Process Payment (depends on capture mode)                               │
│                                                                             │
│     IMMEDIATE CAPTURE (single step):                                        │
│     LOCAL:    POST /api/afterpay/capture-full                               │
│     AFTERPAY: POST /v2/payments/capture                                     │
│     → Auth + capture combined, status = CAPTURED                            │
│                                                                             │
│     DEFERRED CAPTURE (auth only):                                           │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│     → Auth only, capture later from Admin Panel                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How to Test

1. Go to `/checkout`
2. Select **Cash App Pay** tab
3. Fill in customer details (email, name, address, phone)
4. Select shipping method
5. Click **"Continue to Payment"**
6. Cash App Pay button appears:
   - **Desktop**: Tap the button, then scan the QR code with Cash App
   - **Mobile**: Tap the button to open Cash App
7. Complete payment in Cash App
8. View confirmation page

### Key Differences from Express/Standard

| Feature | Express | Standard | Cash App Pay |
|---------|---------|----------|--------------|
| Checkout creation | Same API | Same API | Same API + `isCashAppPay: true` |
| Customer interaction | Afterpay popup | Redirect or popup | QR code or Cash App redirect |
| SDK method | `initializeForPopup()` | `open()` or redirect | `initializeForCashAppPay()` |
| Shipping | In popup or deferred | Merchant site form | Merchant site form |
| Payment type | Pay in 4 (BNPL) | Pay in 4 (BNPL) | Pay now (full amount) |

### Mobile vs Desktop

The component displays different messaging based on viewport:

- **Desktop** (768px+): "Tap the button below, and scan the QR code to pay with Cash App Pay."
- **Mobile** (< 768px): "Tap the button below to pay with Cash App Pay."

This uses CSS responsive classes (`hidden md:inline` / `md:hidden`) to avoid React hydration mismatches.

### Edit / Retry Flow

After submitting the form, you can:

1. **Edit**: Click "Edit" to return to the form, modify details, and resubmit
2. **Try Again**: If payment is declined, click "Try Again" to restart

Both flows use the SDK's 3-step restart pattern:
```
restartCashAppPay()        → Clears SDK auth state and removes button UI
renderCashAppPayButton()   → Re-creates the button element
initializeForCashAppPay()  → Initializes with new checkout token
```

### Tab Switching

Cash App Pay preserves form state when switching between Standard and Cash App Pay tabs. All components stay mounted in the DOM (hidden via CSS), so form data is never lost. When you switch back to the Cash App Pay tab, the SDK re-initializes automatically with the previously saved token.

### Technical Details

**SDK Initialization:**
```typescript
// 1. Render button into #cash-app-pay container
window.Afterpay.renderCashAppPayButton({
  countryCode: "US",
  cashAppPayButtonOptions: {
    size: "medium",
    width: "full",
    theme: "dark",
    shape: "semiround",
  },
});

// 2. Initialize with checkout token
window.Afterpay.initializeForCashAppPay({
  countryCode: "US",
  token: checkoutToken,
  cashAppPayOptions: {
    button: { size: "medium", width: "full", theme: "dark", shape: "semiround" },
    onComplete: (event) => {
      // event.data: { status, orderToken, cashtag }
    },
    eventListeners: {
      CUSTOMER_REQUEST_DECLINED: () => { /* handle decline */ },
      CUSTOMER_REQUEST_FAILED: () => { /* handle failure */ },
    },
  },
});
```

**Afterpay Documentation:** [Cash App Pay Integration Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview)

<details>
<summary>✓ Verify Cash App Pay</summary>

- [ ] Cash App Pay tab visible on checkout page when enabled in Admin Configuration
- [ ] Form fields validate correctly
- [ ] Button renders after "Continue to Payment"
- [ ] Desktop shows QR code messaging
- [ ] Mobile shows redirect messaging
- [ ] Edit → resubmit renders button correctly
- [ ] Tab switch preserves form state
- [ ] Tab switch back re-renders button
- [ ] Try Again works after decline
- [ ] Confirmation page displays after completion

</details>

---

## Capture Modes

Two distinct payment flows determine when money is captured from the customer. Toggle between them in `/admin` > **Configuration** tab > **Capture Mode**.

---

### Immediate Payment Flow

Authorizes and captures in a single API call. The capture is processed the moment checkout completes.

**Best for:** Digital goods, instant fulfillment, subscriptions — any scenario where you can fulfill immediately.

**How it works:**
1. Customer completes checkout (Express, Standard, or Cash App Pay)
2. Your server calls the Immediate Capture endpoint
3. Payment is authorized **and** captured in one step
4. Confirmation shows "Thank you for your order!" (green)
5. Funds are captured — no further action needed

**API:**
| Step | Endpoint | Afterpay API | Docs |
|------|----------|--------------|------|
| Auth + Capture | `POST /api/afterpay/capture-full` | `POST /v2/payments/capture` | [Immediate Capture](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-full-payment) |

**Request body:**
```json
{
  "token": "ORDER_TOKEN_FROM_CHECKOUT",
  "merchantReference": "order-123"
}
```

**Response includes:** `id` (Order ID), `status: "APPROVED"`, `originalAmount`, `events` with capture details.

---

### Deferred Payment Flow

Separates authorization from capture into two distinct steps. The authorization is completed but not captured until the merchant explicitly captures.

**Best for:** Physical goods, pre-orders, ship-then-capture workflows — any scenario where you need to verify inventory or fulfill before charging.

**How it works:**
1. Customer completes checkout (Express, Standard, or Cash App Pay)
2. Your server calls the Auth endpoint — payment is **authorized only**
3. Confirmation shows "Payment Authorized!" (blue)
4. Later, navigate to Admin Panel > Payment Operations
5. Look up order by ID
6. Click "Capture Payment" and enter the amount
7. Funds are captured

**API:**
| Step | Endpoint | Afterpay API | Docs |
|------|----------|--------------|------|
| 1. Authorize | `POST /api/afterpay/auth` | `POST /v2/payments/auth` | [Authorise Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth) |
| 2. Capture (later) | `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` | [Deferred Capture](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |

**Step 1 — Auth request body:**
```json
{
  "token": "ORDER_TOKEN_FROM_CHECKOUT",
  "merchantReference": "order-123"
}
```

**Step 2 — Capture request body:**
```json
{
  "amount": { "amount": "50.00", "currency": "USD" },
  "requestId": "unique-uuid"
}
```

> **Note:** Deferred capture supports partial captures. You can capture less than the authorized amount (e.g., capture only the items you're shipping now). The remaining authorized amount can be captured later or voided.

**Afterpay Documentation:** [Deferred Capture Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture)

---

### Comparing the Two Flows

| | Immediate | Deferred |
|---|-----------|----------|
| **API calls** | 1 (auth + capture) | 2 (auth, then capture) |
| **When charged** | At checkout | When merchant captures |
| **Partial capture** | No | Yes |
| **Confirmation message** | "Thank you for your order!" (green) | "Payment Authorized!" (blue) |
| **Admin action needed** | None | Capture from Admin Panel |
| **Best for** | Digital goods, instant fulfillment | Physical goods, pre-orders |

<details>
<summary>✓ Verify Capture Modes</summary>

- [ ] Toggle persists in config (localStorage)
- [ ] Immediate: Single API call, status = CAPTURED, green confirmation
- [ ] Deferred: Auth only, status = AUTHORIZED, blue confirmation
- [ ] Deferred: Capture from Admin Panel works (full and partial)
- [ ] Confirmation message matches selected mode

</details>

---

# Part 3: Payment Operations

## Payment Admin Panel

Full payment management and configuration interface.

### URL: `/admin`

### Admin Tabs

The Admin page has two tabs:

#### Configuration Tab (New in v3.0)

Centralized settings for all checkout features:

| Section | Description |
|---------|-------------|
| Express Checkout | ON/OFF toggle + shipping type (Integrated/Deferred) |
| Standard Checkout | Always ON badge + method (Popup/Redirect) |
| Cash App Pay | ON/OFF toggle |
| Capture Mode | Deferred/Immediate radio cards |
| Developer Mode | ON/OFF toggle — hides/shows code snippets, flow logs, dev panels |
| Merchant Configuration | Fetch min/max order thresholds and currency from API |

All settings are stored in `ConfigProvider` React Context, persisted to localStorage as `"afterpay-demo-config"`, and accessible via the `useConfig()` hook. Changes take effect instantly with no page refresh needed.

#### Payment Operations Tab

Payment management features (same as previous versions):

| Feature | Description |
|---------|-------------|
| Payment Lookup | Search by Afterpay Order ID |
| Amount Breakdown | Visual display of captured/refunded/voided amounts |
| Actions | Capture, Refund, Void with partial amount support |
| Event History | Timeline of all payment events |

### Merchant Configuration
- View merchant configuration (min/max order thresholds, currency) in the Configuration tab

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
| `/api/afterpay/capture` | POST | `POST /v2/payments/{id}/capture` | Deferred Capture (full/partial) | [Capture Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |
| `/api/afterpay/capture-full` | POST | `POST /v2/payments/capture` | Immediate Capture (auth + capture) | [Immediate Capture](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-full-payment) |
| `/api/afterpay/refund` | POST | `POST /v2/payments/{id}/refund` | Refund (full/partial) | [Create Refund](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund) |
| `/api/afterpay/void` | POST | `POST /v2/payments/{id}/void` | Void (full/partial) | [Void Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment) |
| `/api/afterpay/payment/[id]` | GET | `GET /v2/payments/{id}` | Get payment details | [Get Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id) |
| `/api/afterpay/configuration` | POST | `GET /v2/configuration` | Get merchant config | [Get Configuration](https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration) |

**Sandbox Base URL:** `https://global-api-sandbox.afterpay.com`

### Server-Side Retry Logic

All Afterpay API calls include automatic retry logic for transient server errors. The `afterpayFetch` wrapper in `lib/afterpay.ts` handles this transparently:

- **Retried status codes:** 500, 502, 503, 504
- **Max retries:** 2 (3 total attempts)
- **Backoff:** Linear (1s, 2s)
- **Non-retried errors:** 4xx client errors are thrown immediately

This is especially useful with the Afterpay sandbox environment, which occasionally returns transient 502 "Bad Gateway" or 500 "INTERNAL" errors.

### Error Response Format

All API routes return structured error responses:

```json
{
  "error": "An error occurred. Please try again.",
  "errorDetail": "Afterpay API error: Bad Gateway"
}
```

- `error` — Sanitized, user-safe error message (from `lib/errors.ts`)
- `errorDetail` — Raw Afterpay API error message for debugging

The client components use `errorDetail` (when available) to display more specific error information in the UI.

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
Customer clicks "Buy Now"
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
         ├─── Immediate ──────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│ DEFERRED             │   │ IMMEDIATE                    │
│ POST /api/afterpay/  │   │ POST /api/afterpay/          │
│   auth               │   │   capture-full               │
│ → POST /v2/payments/ │   │ → POST /v2/payments/capture  │
│   auth               │   │ ← orderId, CAPTURED          │
│ ← orderId, APPROVED  │   └──────────────────────────────┘
│                      │
│ (capture later from  │
│  Admin Panel)        │
└──────────────────────┘
```

### Standard Checkout - Redirect Flow

```
Customer fills form, clicks "Pay with Afterpay"
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
         ├─── Immediate ──────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│ DEFERRED             │   │ IMMEDIATE                    │
│ POST /api/afterpay/  │   │ POST /api/afterpay/          │
│   auth               │   │   capture-full               │
│ → POST /v2/payments/ │   │ → POST /v2/payments/capture  │
│   auth               │   │ ← orderId, CAPTURED          │
│ ← orderId, APPROVED  │   └──────────────────────────────┘
│                      │
│ (capture later from  │
│  Admin Panel)        │
└──────────────────────┘
```

### Deferred Capture / Refund / Void (Post-Payment Operations)

```
After authorization (Deferred flow), the following operations
are available from the Admin Panel:

┌─────────────────────────────────────┐
│ DEFERRED CAPTURE                    │
│ POST /api/afterpay/capture          │
│ → Afterpay: POST /v2/payments/      │
│   {id}/capture                      │
│ Body: { amount, orderId }           │
│ Supports partial capture            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ REFUND                              │
│ POST /api/afterpay/refund           │
│ → Afterpay: POST /v2/payments/      │
│   {id}/refund                       │
│ Body: { amount, orderId }           │
│ Available after capture (any mode)  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ VOID                                │
│ POST /api/afterpay/void             │
│ → Afterpay: POST /v2/payments/      │
│   {id}/void                         │
│ Body: { orderId }                   │
│ Available before capture (deferred) │
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

## FAQ

### General Questions

**What's the difference between Express and Standard Checkout?**

Express Checkout (Buy Now) uses Afterpay.js to open a popup directly from any page — product pages, cart, or mini-cart. Afterpay handles the shipping address collection inside the popup. Standard Checkout redirects or opens a popup from the checkout page after you've filled in your details. Express is faster for customers; Standard gives the merchant more control over the checkout experience.

**When should I use deferred vs immediate capture?**

Deferred capture separates authorization from capture — you authorize at checkout, then capture later when you're ready to fulfill the order. This is ideal for merchants who don't ship immediately (e.g., pre-orders, made-to-order items). Immediate capture authorizes and captures in a single step, which is simpler and works well when you can fulfill orders right away.

**Can I test with real money in the sandbox?**

No. The sandbox environment uses test credentials and no real transactions are processed. You can simulate approved and declined payments using the test CVV codes: `000` for approved, `051` for declined.

**What test cards are available?**

The sandbox accepts any valid-looking card number (e.g., 4111 1111 1111 1111). The CVV controls the outcome: `000` = approved, `051` = declined, `100` = gateway timeout. The email used during checkout must be the sandbox test account email.

**How does the token flow work?**

1. **Create Checkout** → Receives a `checkoutToken`
2. **Customer completes Afterpay flow** → Returns an `orderToken` (via redirect URL or popup callback)
3. **Authorize payment** (using `orderToken`) → Receives an `orderId` and payment status
4. **Subsequent operations** (capture, refund, void) use the `orderId`

**What is On-Site Messaging and where does it appear?**

On-Site Messaging (OSM) shows "Pay in 4" or "Pay Monthly" badges that display the installment breakdown for a given amount. In this demo, On-Site Messaging appears on product detail pages, the cart page, and the checkout page. The messaging updates automatically when the cart amount changes.

**Can I use Cash App Pay with Express Checkout?**

No. Cash App Pay and Express Checkout are separate flows. Cash App Pay is available on the checkout page as a tab alongside Standard Checkout. Express Checkout is available via Buy Now buttons on product and cart pages.

### Common Issues

**Popup flow shows "Cancelled"**

The `popupOriginUrl` in the checkout request doesn't match the actual page URL. Ensure `NEXT_PUBLIC_APP_URL` in your `.env.local` exactly matches where the app is running (e.g., `http://localhost:3000`).

**On-Site Messaging not displaying**

Invalid placement IDs or MPID. Verify that `NEXT_PUBLIC_AFTERPAY_MPID`, `NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID`, and `NEXT_PUBLIC_OSM_CART_PLACEMENT_ID` are correctly set in your environment variables.

**Widget not loading (deferred shipping)**

Afterpay.js script not loaded. Check that the Afterpay.js script tag is included in the page.

**Capture fails with "Already Captured"**

The payment was already captured. Refresh the payment details in the Admin Panel to see the current state.

**Refund exceeds available amount**

The refund amount is greater than the captured amount minus any previous refunds. Check the "Available to Refund" amount shown in the Admin Panel.

**Cash App Pay button not rendering**

The Cash App Pay container element must exist in the DOM before the SDK initializes. If the button doesn't appear, ensure the container div is rendered before calling `initializeForCashAppPay()`.

**Cash App Pay button appears with wrong size or style**

The SDK renders the button inside a shadow DOM with its own styles. External CSS cannot affect the button's appearance. Style overrides must be injected directly into the shadow root.

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
| Cash App Pay | isCashAppPay, countryCode, redirectConfirmUrl | - |

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
- Checkout page (when Developer Mode is ON)
- Visible for Standard Checkout and Cash App Pay sections

### Features
- Syntax-highlighted code
- Copy to clipboard
- Updates when switching methods

<details>
<summary>✓ Verify Code Viewer</summary>

- [ ] Code viewer displays correct code
- [ ] Code updates per checkout method
- [ ] Copy to clipboard works

</details>

---

# Part 6: Reference

### Dark Mode

Toggle between light and dark themes using the sun/moon icon in the header. The app detects your system preference on first visit and saves your choice to localStorage.

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
| Immediate Capture | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-full-payment |
| Deferred Capture | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment |
| Create Refund | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund |
| Void Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment |
| Get Payment | https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id |
| Get Configuration | https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration |

---

## Changelog

### February 2026

#### v3.0.2 - Express Checkout Fixes
- **Integrated Shipping Amount Fix**: Server-side amount resolution for Express Checkout with Integrated Shipping + Immediate Capture — when the SDK's `onShippingOptionChange` callback doesn't fire reliably, the server now fetches the checkout to get the authoritative amount including shipping
- **Flow Label Fix**: Buy Now (Express Checkout) flows now correctly display as "Express Checkout" instead of "Standard Checkout" on the confirmation page

#### v3.0.1 - Cash App Pay Capture Fix
- **Immediate Capture Fix**: Cash App Pay now uses single-step `POST /v2/payments/capture` (was incorrectly using two-step auth + capture)
- **Deferred Capture Fix**: Cash App Pay deferred flow correctly uses `POST /v2/payments/auth` only
- **Error Detail Surfacing**: All API routes now return `errorDetail` field with raw Afterpay error messages alongside sanitized `error` field
- **Server-Side Retry Logic**: `afterpayFetch` automatically retries on transient 500/502/503/504 errors with linear backoff (max 2 retries)
- **SDK Navigation Fix**: Cash App Pay confirmation redirect uses `window.location.href` instead of `router.push` to fully clear Pay Kit state between orders

#### v3.0.0 - Configurable Demo Platform
- **Centralized Configuration**: New Admin Configuration tab with toggles for Express Checkout, Cash App Pay, Developer Mode, capture mode, and checkout method
- **ConfigProvider**: React Context + localStorage persistence replaces scattered localStorage keys
- **Buy Now Express Checkout**: Inline popup from Product pages, Cart, and Mini-cart via Buy Now buttons (Express removed from checkout page)
- **Branded Buttons**: BuyNowButton (custom mint) and AfterpayButton (official SVG) components
- **Developer Mode Toggle**: Hide/show code snippets, flow logs, and dev panels across all pages
- **Simplified Checkout**: Standard + Cash App Pay only (no Express tab), branded "Pay with Afterpay" button
- **Bold Brand-Forward Design**: Clash Display + General Sans + JetBrains Mono typography, mint-dominant palette
- **Header Redesign**: Flat nav, mini-cart dropdown, developer mode indicator bar
- **Admin Redesign**: Configuration + Payment Operations tabs with pill toggles and radio cards

#### v2.7.0 - Cash App Pay
- **Cash App Pay**: Added as third checkout method — QR code on desktop, Cash App redirect on mobile
- **SDK Integration**: `isCashAppPay` flag, `initializeForCashAppPay()`, button rendering with full-width dark theme
- **Tab State Preservation**: All checkout components always-mounted with CSS `display:none` — form state preserved across tab switches
- **SDK Lifecycle**: `isActive` prop manages SDK restart/re-init on tab switch, preventing conflicts between Express and Cash App Pay
- **Button Style Fix**: Shadow DOM style override ensures consistent full-width semiround button
- **Developer Docs**: Cash App Pay integration code snippets section with copy buttons

#### v2.6.0 - Idempotency & Checkout UX
- **Idempotency Support**: Added `requestId` to all payment operations (auth, capture, refund, void) for safe retries on timeout/network failures
- **Dynamic Shipping Updates**: Order Summary sidebar updates shipping and total in real-time with subtle highlight animation
- **Free Shipping**: Automatically offered for orders over $100 with "FREE" badge
- **Wider Order Summary**: 60/40 grid split on desktop prevents On-Site Messaging widget wrapping
- **Scroll-to-Top Button**: Accessible, centered button appears on scroll with bouncy Afterpay mint hover effect
- **Developer Panel**: Redesigned header, improved resize handle, requestId visible in event details
- **Admin Panel**: Transaction status messages now appear above Actions section
- **Orders Page**: Demo notice moved to top of list for better visibility

#### v2.5.0 - Dark Mode & On-Site Messaging Improvements
- **On-Site Messaging Dark Mode Support**: Added light background containers for On-Site Messaging widget in dark mode to ensure proper widget visibility and accurate payment calculations
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
- **Order History**: Persistent order tracking with individual deletion
- **Admin Panel**: Full payment management with capture, refund, void operations

#### v2.1.0 - Checkout Features
- **Express Checkout**: Integrated and deferred shipping flows
- **Standard Checkout**: Redirect and popup methods
- **Capture Modes**: Toggle between deferred and immediate capture

#### v2.0.0 - Initial Release
- Core shopping experience with product catalog and cart
- On-Site Messaging integration
- Dark mode with system preference detection
- Mobile-responsive design
