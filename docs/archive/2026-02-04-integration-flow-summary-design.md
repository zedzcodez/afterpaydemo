# Integration Flow Summary Design

**Date:** 2026-02-04
**Purpose:** Add a summary panel to the Integration Flow component on the confirmation page

---

## Overview

Add a summary panel between the Integration Flow header and timeline that displays:
1. Flow description and steps
2. Critical request configuration values
3. Checkout adjustment details (for deferred shipping)
4. Key response data
5. Links to Afterpay documentation

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ [icon] Integration Flow                      8 STEPS ● │
│         Express Checkout (Deferred Shipping)            │
├─────────────────────────────────────────────────────────┤
│  SUMMARY                                        [Copy]  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Popup-based checkout where customer completes      │ │
│  │ payment in Afterpay, then returns to merchant      │ │
│  │ site to select shipping before authorization.      │ │
│  │                                                    │ │
│  │ STEPS                                              │ │
│  │ 1. Create Checkout → 2. Afterpay Popup →           │ │
│  │ 3. Select Shipping → 4. Authorize Payment          │ │
│  │                                                    │ │
│  │ 📄 Express Checkout Guide                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  REQUEST CONFIGURATION                          [Copy]  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ mode                    "express"              [?] │ │
│  │ merchant.popupOriginUrl "http://localhost:3000"[?] │ │
│  │ merchant.redirectConfirmUrl "/confirmation"    [?] │ │
│  │ isCheckoutAdjusted      true                   [?] │ │
│  │ paymentScheduleChecksum "d8f4a2b1c3e5..."      [?] │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  CHECKOUT ADJUSTMENT (Deferred Shipping only)           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Original Amount    $50.00                          │ │
│  │ Shipping           + $5.00  (Standard Shipping)    │ │
│  │                    ────────                        │ │
│  │ Adjusted Amount    $55.00  ✓ checksum validated    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  RESPONSE DATA                                  [Copy]  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ token                   "002.abc123..."        [?] │ │
│  │ redirectCheckoutUrl     "https://portal..."    [?] │ │
│  │ data.orderToken         "002.xyz789..."        [?] │ │
│  │ id                      "100204124436"         [?] │ │
│  │ status                  "APPROVED"             [?] │ │
│  │ originalAmount          { amount: "55.00" }    [?] │ │
│  │ openToCaptureAmount     { amount: "55.00" }    [?] │ │
│  └────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  [Timeline entries...]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Flow Definitions

### Express Integrated
- **Description:** Popup checkout with shipping selection inside Afterpay popup
- **Steps:** Create Checkout → Afterpay Popup (with shipping) → Authorize
- **Request Config:** `mode`, `merchant.popupOriginUrl`, `shippingOptionRequired`
- **Response Data:** `token`, `data.orderToken`, `data.shippingOptionIdentifier`, `id`, `status`
- **Docs Link:** [Express Checkout Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout)

### Express Deferred
- **Description:** Popup checkout, customer returns to select shipping before auth
- **Steps:** Create Checkout → Afterpay Popup → Select Shipping → Authorize
- **Request Config:** `mode`, `merchant.popupOriginUrl`, `isCheckoutAdjusted`, `paymentScheduleChecksum`
- **Response Data:** `token`, `data.orderToken`, `id`, `status`, `originalAmount`
- **Shows:** Checkout Adjustment section with original → adjusted amounts
- **Docs Link:** [Express Checkout - Deferred Shipping](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping)

### Standard Redirect
- **Description:** Full-page redirect to Afterpay, returns via URL
- **Steps:** Create Checkout → Redirect to Afterpay → Return → Authorize
- **Request Config:** `merchant.redirectConfirmUrl`, `merchant.redirectCancelUrl`
- **Response Data:** `token`, `redirectCheckoutUrl`, `orderToken` (URL param), `id`, `status`
- **Docs Link:** [API Quickstart](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart)

### Standard Popup
- **Description:** Modal popup for Afterpay, stays on merchant site
- **Steps:** Create Checkout → Afterpay Popup → Authorize
- **Request Config:** `merchant.popupOriginUrl`, `merchant.redirectConfirmUrl`
- **Response Data:** `token`, `data.orderToken`, `id`, `status`
- **Docs Link:** [Popup Method](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method)

---

## Documentation Links

| Parameter | Afterpay Docs |
|-----------|---------------|
| `mode` | [Express Checkout](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout) |
| `merchant.popupOriginUrl` | [Popup Method](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method) |
| `merchant.redirectConfirmUrl` | [Create Checkout](https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1) |
| `isCheckoutAdjusted` | [Deferred Shipping](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping) |
| `paymentScheduleChecksum` | [Payment Schedule Widget](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout#deferred-shipping) |
| `token` | [Checkout Response](https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1) |
| `id` / `status` | [Auth Response](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth) |

---

## Copy Button

### Output Format

```json
{
  "_disclaimer": "This is a summary of core integration flow data, not an actual Afterpay API response. For raw API requests and responses, expand the timeline entries below.",
  "flow": "express-deferred",
  "description": "Popup-based checkout with deferred shipping selection",
  "steps": ["Create Checkout", "Afterpay Popup", "Select Shipping", "Authorize Payment"],
  "requestConfig": {
    "mode": "express",
    "merchant.popupOriginUrl": "http://localhost:3000",
    "isCheckoutAdjusted": true,
    "paymentScheduleChecksum": "d8f4a2b1c3e5..."
  },
  "adjustment": {
    "originalAmount": { "amount": "50.00", "currency": "USD" },
    "shippingAmount": { "amount": "5.00", "currency": "USD" },
    "adjustedAmount": { "amount": "55.00", "currency": "USD" }
  },
  "responseData": {
    "token": "002.abc123...",
    "orderToken": "002.xyz789...",
    "id": "100204124436",
    "status": "APPROVED"
  }
}
```

### Toast Message

> **Copied!** This is a summary of core flow data. See timeline entries for actual API responses.

---

## Implementation

### Data Collection

Extend `FlowLogs` interface to store summary data:

```typescript
interface FlowSummary {
  flow: string;
  description: string;
  steps: string[];
  docsUrl: string;
  requestConfig: Record<string, unknown>;
  responseData: Record<string, unknown>;
  adjustment?: {
    originalAmount: Money;
    shippingAmount: Money;
    shippingName: string;
    adjustedAmount: Money;
    checksum: string;
  };
}

interface FlowLogs {
  flow: string;
  startTime: string;
  entries: FlowLogEntry[];
  summary?: FlowSummary;  // NEW
}
```

### Files to Modify

1. `lib/flowLogs.ts` - Add `FlowSummary` interface and `setFlowSummary()` function
2. `components/CheckoutExpress.tsx` - Collect and store summary data during checkout
3. `components/CheckoutStandard.tsx` - Collect and store summary data during checkout
4. `app/confirmation/page.tsx` - Render `FlowSummarySection` component
5. `app/checkout/shipping/page.tsx` - Store adjustment data for deferred flow

### New Component

Create `FlowSummarySection` component within `app/confirmation/page.tsx` that:
- Receives `FlowSummary` data
- Renders description, steps, config, response data
- Handles copy button with toast
- Shows adjustment section conditionally
- Links to Afterpay docs

---

## Success Criteria

- [ ] Summary panel appears between header and timeline
- [ ] Flow description and steps display correctly for all 4 flows
- [ ] Request configuration shows flow-specific parameters
- [ ] Response data shows key values from API responses
- [ ] Checkout adjustment section appears only for deferred shipping
- [ ] Copy button outputs JSON with disclaimer
- [ ] Doc links open correct Afterpay documentation pages
- [ ] Styling matches existing dark theme
