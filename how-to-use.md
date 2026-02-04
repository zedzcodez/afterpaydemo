# How to Use This Demo

This guide walks you through testing all features of the Afterpay Demo Shop, with explanations of the technical implementation details you can review.

## Table of Contents

1. [Quick Start](#quick-start)
2. [On-Site Messaging (OSM)](#on-site-messaging-osm)
3. [Express Checkout](#express-checkout)
4. [Standard Checkout](#standard-checkout)
5. [Capture Modes](#capture-modes)
6. [Custom API Credentials](#custom-api-credentials)
7. [Payment Admin Panel](#payment-admin-panel)
8. [Developer Tools](#developer-tools)

---

## Quick Start

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Add products to cart
4. Go to Checkout and test different flows
5. Use sandbox credentials to complete checkout

**Sandbox Test Account:**
- Email: Use any email
- Login: Use the OTP shown in the sandbox popup

---

## On-Site Messaging (OSM)

### What It Does
Displays "Pay in 4 interest-free payments of $X.XX" badges to inform customers about Afterpay availability.

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
```jsx
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

---

## Express Checkout

Express Checkout uses Afterpay.js to provide a streamlined popup-based checkout experience.

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
```javascript
onShippingAddressChange: (addressData, actions) => {
  // Calculate shipping options based on address
  const options = getShippingOptions();
  actions.resolve(options);
}
```

**Shipping Option Structure:**
```javascript
{
  id: 'standard',
  name: 'Standard Shipping',
  description: '5-7 business days',
  shippingAmount: { amount: '5.99', currency: 'USD' },
  taxAmount: { amount: '0.00', currency: 'USD' },
  orderAmount: { amount: '105.99', currency: 'USD' }
}
```

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

**Payment Schedule Widget:**
```javascript
new window.AfterPay.Widgets.PaymentSchedule({
  token: orderToken,
  amount: { amount: '105.99', currency: 'USD' },
  target: '#afterpay-widget',
  onChange: (event) => {
    // Get checksum for capture
    const checksum = event.data.paymentScheduleChecksum;
  }
});
```

**Important:** When amount changes (shipping selection), call `widget.update({ amount })` to refresh the payment schedule.

---

## Standard Checkout

Standard Checkout uses server-side API calls with customer information collected on the merchant site.

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
1. `POST /api/afterpay/checkout` - Create checkout, get `redirectCheckoutUrl`
2. Redirect to `redirectCheckoutUrl`
3. Customer returns with `orderToken` in URL
4. `POST /api/afterpay/auth` - Authorize payment
5. `POST /api/afterpay/capture` (Immediate mode) or skip (Deferred mode)

**File:** `app/checkout/review/page.tsx`

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
```javascript
// MUST open popup synchronously in click handler to avoid blockers
window.Afterpay.initialize({ countryCode: 'US' });
window.Afterpay.open();  // Open immediately
window.Afterpay.onComplete = handleComplete;  // Set callback

// Later, after creating checkout:
window.Afterpay.transfer({ token: data.token });
```

**Important:** `popupOriginUrl` in the checkout request MUST match `window.location.origin` exactly (protocol + host + port), or the browser won't dispatch the `onComplete` event.

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

**API:** `POST /api/afterpay/auth` only

### Immediate Capture Mode

**What It Does:** Fully captures payment when checkout completes.

**Use Cases:**
- Digital goods
- Instant fulfillment

**Flow:**
1. Checkout completes with full capture
2. Confirmation shows "Thank you for your order!" (green)
3. Payment already captured

**API:** `POST /api/afterpay/capture-full` (combines auth + capture)

**Technical Details:**

**Storage:** `localStorage.getItem('afterpay_capture_mode')`

**Values:** `'deferred'` or `'immediate'`

**Capture Full API:**
```javascript
// POST /v2/payments/capture
{ token: 'checkout-token' }
```

---

## Custom API Credentials

Test the demo with your own Afterpay sandbox credentials to see your actual merchant configuration.

### Where to Find

Admin Panel (`/admin`) → "API Credentials" section

### How to Use

#### Using Default Credentials
1. Go to `/admin`
2. "API Credentials" section shows "Default" selected
3. Configuration displays using the demo's environment credentials

#### Using Custom Credentials
1. Go to `/admin`
2. Click "Custom" button in "API Credentials" section
3. Enter your Merchant ID
4. Enter your Secret Key
5. Click "Validate Credentials"
6. Configuration displays your merchant's min/max thresholds

### What You'll See

After validation, the **Merchant Configuration** panel displays:

| Field | Description |
|-------|-------------|
| Minimum Order | Lowest order amount eligible for Afterpay |
| Maximum Order | Highest order amount eligible for Afterpay |
| Currency | The currency for these thresholds (USD, AUD, NZD, CAD, GBP) |

### Technical Details

**File:** `app/api/afterpay/configuration/route.ts`

**API Endpoint:** `GET /v2/configuration`

**Request (with custom credentials):**
```javascript
// POST /api/afterpay/configuration
{
  merchantId: "your_merchant_id",
  secretKey: "your_secret_key"
}
```

**Request (with default credentials):**
```javascript
// POST /api/afterpay/configuration
{}
// Uses AFTERPAY_MERCHANT_ID and AFTERPAY_SECRET_KEY from environment
```

**Response:**
```javascript
{
  minimumAmount: { amount: "1.00", currency: "USD" },
  maximumAmount: { amount: "2000.00", currency: "USD" },
  usingCustomCredentials: true
}
```

### Security Notes

- Custom credentials are stored in React state only (not localStorage)
- Credentials are cleared when switching back to "Default" mode
- Secret key input is masked (password field)
- Credentials are sent to the server-side API route for validation

### Use Cases

- **Verify your account setup**: Confirm your merchant configuration is correct
- **Test with different accounts**: Compare configuration across sandbox accounts
- **Validate before production**: Ensure settings match expectations

---

## Payment Admin Panel

Full payment management interface for post-checkout operations.

### URL: `/admin`

### Features

#### API Credentials & Configuration
- Toggle between default (environment) and custom credentials
- View merchant configuration (min/max order thresholds)
- See [Custom API Credentials](#custom-api-credentials) for detailed usage

#### Payment Lookup
1. Enter Order ID (e.g., `100204123295`)
2. Click "Lookup"
3. View payment details, status, and history

#### Amount Breakdown
Shows real-time calculation of:
- Original Amount
- Captured Amount
- Refunded Amount
- Voided Amount
- Open to Capture
- Available to Refund

#### Actions

| Action | When Available | What It Does |
|--------|----------------|--------------|
| Capture | Open to Capture > $0 | Captures authorized funds |
| Refund | Captured - Refunded > $0 | Returns funds to customer |
| Void | Open to Capture > $0 | Cancels authorization |

**Partial Operations:** All actions support partial amounts. Enter specific amount or use the default (maximum).

#### Event History
Unified timeline showing:
- `AUTH_APPROVED` - Authorization events
- `CAPTURED` - Capture events
- `REFUND` - Refund events
- `VOID` - Void events

### Technical Details

**Files:**
- `app/admin/page.tsx` - Admin UI
- `app/api/afterpay/payment/[orderId]/route.ts` - Get payment details
- `app/api/afterpay/capture/route.ts` - Capture
- `app/api/afterpay/refund/route.ts` - Refund
- `app/api/afterpay/void/route.ts` - Void

**Payment State Calculation:**
```javascript
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

---

## Developer Tools

### Flow Logs Panel

**What It Does:** Displays real-time API requests and responses during checkout flows.

**Where to Find:**
- Bottom of checkout pages (fixed panel)
- Confirmation page (full timeline)
- Admin panel (during operations)

**Information Shown:**
- Request method and endpoint
- Request body
- Response status code
- Response body
- Duration (ms)

**Toggle:** Click any log entry to expand/collapse details

### Code Viewer

**What It Does:** Shows implementation code for current checkout method.

**Where to Find:**
- Bottom of Express Checkout section
- Bottom of Standard Checkout section

**Features:**
- Syntax-highlighted code
- Copy to clipboard
- Updates when switching methods

### Technical Files

| Feature | File |
|---------|------|
| Flow Logs | `lib/flowLogs.ts` |
| Flow Logs Panel | `components/FlowLogsDevPanel.tsx` |
| Code Viewer | `components/CodeViewer.tsx` |

---

## Testing Checklist

Use this checklist to verify all features work correctly:

### On-Site Messaging
- [ ] OSM displays on product pages
- [ ] OSM displays on cart page
- [ ] OSM displays on checkout page
- [ ] Amount updates when cart changes
- [ ] Info modal opens on click

### Express Checkout - Integrated
- [ ] Popup opens correctly
- [ ] Shipping options display in popup
- [ ] Shipping selection updates total
- [ ] Checkout completes successfully
- [ ] Confirmation page displays

### Express Checkout - Deferred
- [ ] Popup opens correctly
- [ ] Returns to shipping page
- [ ] Payment Schedule Widget loads
- [ ] Widget updates on shipping change
- [ ] Checkout completes successfully

### Standard Checkout - Redirect
- [ ] Form validation works
- [ ] Redirects to Afterpay
- [ ] Returns to review page
- [ ] Place Order works
- [ ] Confirmation displays

### Standard Checkout - Popup
- [ ] Popup opens (no blocker)
- [ ] Customer can complete in popup
- [ ] onComplete callback fires
- [ ] Redirects to confirmation

### Capture Modes
- [ ] Toggle persists in localStorage
- [ ] Deferred: Auth only, status = AUTHORIZED
- [ ] Immediate: Full capture, status = CAPTURED
- [ ] Confirmation message matches mode

### Admin Panel
- [ ] Payment lookup works
- [ ] Status calculation correct
- [ ] Capture works (full and partial)
- [ ] Refund works (full and partial)
- [ ] Void works
- [ ] Event history displays correctly
- [ ] Optimistic updates work

### Custom API Credentials
- [ ] Default credentials selected by default
- [ ] Configuration loads automatically with default credentials
- [ ] Custom credentials form appears when toggled
- [ ] Validate button triggers API call
- [ ] Configuration displays min/max thresholds
- [ ] Invalid credentials show error message
- [ ] Switching back to Default clears custom credentials

### Developer Tools
- [ ] Flow logs capture all API calls
- [ ] Logs expandable with details
- [ ] Code viewer displays correct code
- [ ] Code updates per checkout method

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
