# Cash App Pay Integration Design

## Summary

Add Cash App Pay as a third checkout option in the Afterpay Demo app. Cash App Pay is a "pay now" payment method (USA only) where customers authorize via QR code (desktop) or app redirect (mobile).

## Decisions

- **UI**: New third tab on the checkout page alongside Express and Standard
- **Capture flow**: Reuse existing deferred/immediate capture mode toggle
- **Developer docs**: Include code snippets section (like OSMInfoSection)
- **API**: Reuse existing Afterpay API routes with `isCashAppPay: true` flag

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `components/CheckoutCashApp.tsx` | Cash App Pay checkout component (tab content) |
| `components/CashAppInfoSection.tsx` | Developer documentation and code snippets |

### Modified Files

| File | Change |
|------|--------|
| `app/checkout/page.tsx` | Add "Cash App Pay" as third tab |
| `app/api/afterpay/checkout/route.ts` | Pass `isCashAppPay: true` when requested |
| `lib/afterpay.ts` | Add `isCashAppPay` to checkout creation |
| `lib/types.ts` | Add Cash App Pay TypeScript types |
| `lib/validation.ts` | Update checkout schema for `isCashAppPay` |
| `app/confirmation/page.tsx` | Handle Cash App Pay mobile redirect return |

### No New API Routes

Cash App Pay uses the same Afterpay endpoints:
- `POST /v2/checkouts` (with `isCashAppPay: true`)
- `POST /v2/payments/auth`
- `POST /v2/payments/{id}/capture`

## Checkout Flow

1. User selects Cash App Pay tab on checkout page
2. User fills shipping form (name, address, shipping option)
3. Component creates checkout token via `POST /api/afterpay/checkout` with `isCashAppPay: true`
4. SDK initializes via `AfterPay.initializeForCashAppPay()` with token and button config
5. Cash App Pay button renders into `<div id="cash-app-pay">`
6. Desktop: customer scans QR code, approves in Cash App
7. Mobile: customer redirected to Cash App, approves, returns to `redirectConfirmUrl`
8. `onComplete` fires with `{ status, cashtag, orderToken }`
9. Auth/Capture based on existing capture mode toggle
10. Redirect to `/confirmation` with order details

## Component Details

### CheckoutCashApp.tsx

- SDK readiness: poll for `window.Afterpay.initializeForCashAppPay` availability
- Shipping form: same pattern as CheckoutStandard.tsx
- Cart summary from CartProvider context
- Button config: `theme: 'dark'`, `size: 'medium'`, `width: 'full'`, `shape: 'semiround'`
- Flow logging via existing `addFlowLog()` pattern
- SDK event handlers: `CUSTOMER_INTERACTION`, `CUSTOMER_REQUEST_APPROVED`, `CUSTOMER_REQUEST_DECLINED`, `CUSTOMER_REQUEST_FAILED`, `CUSTOMER_DISMISSED`

### CashAppInfoSection.tsx

- Expandable developer documentation section
- Code snippets for SDK initialization, checkout API, button config, event handling

### Mobile Redirect Handling

- Detect `?cashAppPay=true` on confirmation page return
- Call `AfterPay.initializeCashAppPayListeners()` with `onComplete` callback
- Process auth/capture same as desktop flow

## Error Handling

- **SDK not loaded**: Disabled button with loading message, polling pattern
- **Payment declined/failed**: Error banner with decline reason from SDK event
- **Mobile redirect cancelled**: Detect no callback, show retry option
- **Restart flow**: `AfterPay.restartCashAppPay()` + `AfterPay.renderCashAppPayButton()` for retries
- **USA only**: Note in UI; app already uses `countryCode: "US"`
- **API errors**: Existing `sanitizeError()` handles all Afterpay API errors

## SDK Reference

- Script: `afterpay.js` (already loaded in layout.tsx)
- Init: `AfterPay.initializeForCashAppPay({ countryCode, token, options, events })`
- Mobile listeners: `AfterPay.initializeCashAppPayListeners({ onComplete })`
- Restart: `AfterPay.restartCashAppPay()` + `AfterPay.renderCashAppPayButton()`
- Button container: `<div id="cash-app-pay">`
