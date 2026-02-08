# Cash App Pay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Cash App Pay as a third checkout tab in the Afterpay Demo app, using the same Afterpay API endpoints with `isCashAppPay: true`.

**Architecture:** Extend the existing checkout page with a new tab and component. The backend changes are minimal — just pass `isCashAppPay: true` to the existing `/v2/checkouts` endpoint. The frontend creates a new `CheckoutCashApp` component that uses `AfterPay.initializeForCashAppPay()` from the already-loaded `afterpay.js` SDK. Auth/capture reuses existing flows.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Zod validation, Afterpay.js SDK, Jest for testing.

**Design doc:** `docs/plans/2026-02-07-cash-app-pay-design.md`

---

### Task 1: Add TypeScript types for Cash App Pay

**Files:**
- Modify: `lib/types.ts:112-137` (extend the `Window.Afterpay` interface)

**Step 1: Add Cash App Pay types to the Afterpay global interface**

Add these methods to the existing `Window.Afterpay` interface in `lib/types.ts` (after line 134, before the closing `};`):

```typescript
// Cash App Pay methods
initializeForCashAppPay: (config: CashAppPayConfig) => void;
initializeCashAppPayListeners: (config: { onComplete: (event: CashAppPayCompleteEvent) => void }) => void;
restartCashAppPay: () => void;
renderCashAppPayButton: () => void;
```

And add these new interfaces after the existing `AfterpayMessage` interface (after line 226):

```typescript
export interface CashAppPayConfig {
  countryCode: string;
  token: string;
  options?: {
    button?: boolean;
    manage?: boolean;
    size?: 'small' | 'medium';
    width?: 'full' | 'static';
    theme?: 'dark' | 'light';
    shape?: 'round' | 'semiround';
  };
  events?: {
    onComplete?: (event: CashAppPayCompleteEvent) => void;
    CUSTOMER_INTERACTION?: (event: { data: { isMobile: boolean } }) => void;
    CUSTOMER_REQUEST_APPROVED?: () => void;
    CUSTOMER_REQUEST_DECLINED?: () => void;
    CUSTOMER_REQUEST_FAILED?: () => void;
    CUSTOMER_DISMISSED?: () => void;
  };
  onBegin?: (args: { begin: () => void }) => void;
}

export interface CashAppPayCompleteEvent {
  data: {
    status: 'SUCCESS' | 'CANCELLED';
    cashtag?: string;
    orderToken: string;
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to Cash App Pay types.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Cash App Pay TypeScript types"
```

---

### Task 2: Update validation schema and checkout API route

**Files:**
- Modify: `lib/validation.ts:43-49` (update `checkoutRequestSchema`)
- Modify: `app/api/afterpay/checkout/route.ts:41-54` (pass `isCashAppPay` to API)

**Step 1: Write the failing test**

Add a new test in `__tests__/lib/validation.test.ts` inside the existing `checkoutRequestSchema` describe block:

```typescript
it('validates checkout request with isCashAppPay flag', () => {
  const validRequest = {
    items: [createValidCartItem()],
    total: 50,
    isCashAppPay: true,
  };
  const result = validateRequest(checkoutRequestSchema, validRequest);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.isCashAppPay).toBe(true);
  }
});

it('defaults isCashAppPay to false when not provided', () => {
  const validRequest = {
    items: [createValidCartItem()],
    total: 50,
  };
  const result = validateRequest(checkoutRequestSchema, validRequest);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.isCashAppPay).toBe(false);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/validation.test.ts --verbose 2>&1 | tail -20`
Expected: FAIL — `isCashAppPay` not recognized by schema.

**Step 3: Update validation schema**

In `lib/validation.ts`, add `isCashAppPay` to the `checkoutRequestSchema` (line 49, before the closing `)`):

```typescript
export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart must have at least one item'),
  total: z.number().positive().max(2000, 'Order total cannot exceed $2,000'),
  mode: z.enum(['standard', 'express']).optional().default('standard'),
  consumer: consumerSchema.optional(),
  shipping: shippingSchema.optional(),
  isCashAppPay: z.boolean().optional().default(false),
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/validation.test.ts --verbose 2>&1 | tail -20`
Expected: PASS

**Step 5: Update checkout API route**

In `app/api/afterpay/checkout/route.ts`, update the destructuring (line 25) to include `isCashAppPay`:

```typescript
const { items, total, mode, consumer, shipping, isCashAppPay } = validation.data;
```

And add `isCashAppPay` to the `checkoutRequest` object (around line 53, after `mode`):

```typescript
mode,
...(isCashAppPay && { isCashAppPay: true }),
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

**Step 7: Commit**

```bash
git add lib/validation.ts app/api/afterpay/checkout/route.ts __tests__/lib/validation.test.ts
git commit -m "feat: add isCashAppPay flag to checkout validation and API route"
```

---

### Task 3: Update checkout page with three-tab layout

**Files:**
- Modify: `app/checkout/page.tsx`

**Step 1: Update the CheckoutMethod type and imports**

At the top of `app/checkout/page.tsx`:

Change line 16:
```typescript
type CheckoutMethod = "express" | "standard" | "cashapp";
```

Add import (after line 10):
```typescript
import { CheckoutCashApp } from "@/components/CheckoutCashApp";
```

**Step 2: Update the tab bar to support three tabs**

Replace the tab bar section (lines 101-138) with a three-tab version. Key changes:
- The sliding indicator `width` changes from `50%` to `33.333%`
- The `transform` uses index-based translation: `express`=0, `standard`=1, `cashapp`=2
- Add a third button for "Cash App Pay" with subtitle "Pay Now"

```typescript
{/* Method Toggle */}
<div className="mb-8">
  <div className="relative flex border-b border-afterpay-gray-200 dark:border-afterpay-gray-700">
    {/* Sliding indicator */}
    <div
      className="absolute bottom-0 h-0.5 bg-afterpay-mint transition-all duration-300 ease-out"
      style={{
        width: "33.333%",
        transform: `translateX(${method === "express" ? "0" : method === "standard" ? "100%" : "200%"})`,
      }}
    />
    <button
      onClick={() => setMethod("express")}
      className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
        method === "express"
          ? "text-afterpay-black dark:text-white"
          : "text-afterpay-gray-500 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
      }`}
    >
      Express Checkout
      <span className="block text-xs font-normal mt-1">
        Afterpay.js Popup
      </span>
    </button>
    <button
      onClick={() => setMethod("standard")}
      className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
        method === "standard"
          ? "text-afterpay-black dark:text-white"
          : "text-afterpay-gray-500 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
      }`}
    >
      Standard Checkout
      <span className="block text-xs font-normal mt-1">
        API Integration
      </span>
    </button>
    <button
      onClick={() => setMethod("cashapp")}
      className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
        method === "cashapp"
          ? "text-afterpay-black dark:text-white"
          : "text-afterpay-gray-500 hover:text-afterpay-gray-700 dark:hover:text-afterpay-gray-300"
      }`}
    >
      Cash App Pay
      <span className="block text-xs font-normal mt-1">
        Pay Now
      </span>
    </button>
  </div>
</div>
```

**Step 3: Add method description for Cash App Pay**

Update the method description section (lines 140-163) to include a third case:

```typescript
{method === "cashapp" && (
  <div>
    <h3 className="font-medium mb-2">Cash App Pay Flow</h3>
    <p className="text-sm text-afterpay-gray-600">
      Pay now with Cash App. Customers scan a QR code on
      desktop or are redirected to the Cash App on mobile.
      Uses the same Afterpay API with isCashAppPay flag.
    </p>
  </div>
)}
```

**Step 4: Add the Cash App Pay component rendering**

Update the checkout form section (lines 165-174) to include the Cash App Pay case:

```typescript
{method === "express" ? (
  <CheckoutExpress initialShippingFlow={initialShippingFlow} />
) : method === "standard" ? (
  <CheckoutStandard onShippingChange={handleShippingChange} />
) : (
  <CheckoutCashApp onShippingChange={handleShippingChange} />
)}
```

**Step 5: Reset shipping when switching to Cash App Pay too**

Update the `useEffect` (lines 48-52) to also reset shipping for Cash App Pay:

```typescript
useEffect(() => {
  if (method !== "standard") {
    setSelectedShipping(null);
  }
}, [method]);
```

**Step 6: This will not compile yet** (CheckoutCashApp doesn't exist). Create a minimal stub so the page doesn't break. Create `components/CheckoutCashApp.tsx` with a placeholder:

```typescript
"use client";

export function CheckoutCashApp({ onShippingChange }: { onShippingChange?: (option: { id: string; name: string; description?: string; price: number }) => void }) {
  return (
    <div className="text-center py-12 text-afterpay-gray-500">
      Cash App Pay component loading...
    </div>
  );
}
```

**Step 7: Verify it compiles and renders**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

Manually verify: Open http://localhost:3000/checkout — you should see three tabs.

**Step 8: Commit**

```bash
git add app/checkout/page.tsx components/CheckoutCashApp.tsx
git commit -m "feat: add Cash App Pay tab to checkout page"
```

---

### Task 4: Build the CheckoutCashApp component

**Files:**
- Modify: `components/CheckoutCashApp.tsx` (replace stub)

This is the main component. It follows the patterns from `CheckoutStandard.tsx` (shipping form) and `CheckoutExpress.tsx` (SDK initialization).

**Step 1: Implement the full component**

The component should include:

1. **Imports**: React hooks, cart context, flow logging, afterpay lib functions, types
2. **Shipping form**: Same fields as CheckoutStandard (name, email, phone, address, city, state, zip, shipping option dropdown)
3. **Shipping options**: Same calculation as CheckoutStandard (free shipping over $100)
4. **SDK readiness check**: Poll for `window.Afterpay?.initializeForCashAppPay`
5. **Checkout token creation**: POST to `/api/afterpay/checkout` with `isCashAppPay: true`
6. **SDK initialization**: Call `AfterPay.initializeForCashAppPay()` with token, button options, and event handlers
7. **onComplete handler**: Auth (+ optional capture) then redirect to `/confirmation`
8. **Flow logging**: Use `addFlowLog()` for all steps
9. **Cash App Pay button container**: `<div id="cash-app-pay">`
10. **Error/status display**: Show payment status, errors, loading states

Key patterns to follow from existing components:
- `CheckoutStandard.tsx:98-138` for shipping form state
- `CheckoutStandard.tsx:119-138` for shipping option calculation
- `CheckoutExpress.tsx:170-180` for SDK readiness polling
- `CheckoutExpress.tsx:80-145` for checkout token creation
- `CheckoutExpress.tsx:238-280` for auth/capture flow

The component accepts `onShippingChange` prop (like CheckoutStandard) to update the order summary sidebar.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

**Step 3: Manually test in browser**

1. Open http://localhost:3000, add item to cart
2. Go to checkout, click "Cash App Pay" tab
3. Fill shipping form
4. Cash App Pay button should render
5. Click button — QR code should appear (sandbox mode)

**Step 4: Commit**

```bash
git add components/CheckoutCashApp.tsx
git commit -m "feat: implement Cash App Pay checkout component"
```

---

### Task 5: Build the CashAppInfoSection component

**Files:**
- Create: `components/CashAppInfoSection.tsx`

**Step 1: Implement the developer info section**

Follow the pattern from `components/OSMInfoSection.tsx`. This should be an expandable section showing:

1. **Overview**: Brief explanation of Cash App Pay integration
2. **Code snippet: Checkout API**: Show the `/v2/checkouts` request with `isCashAppPay: true`
3. **Code snippet: SDK Initialization**: Show `AfterPay.initializeForCashAppPay()` call
4. **Code snippet: Button Options**: Show available button customization options
5. **Code snippet: Event Handling**: Show event handler setup

Use the existing `CodeViewer` component for code snippets.

**Step 2: Add CashAppInfoSection to CheckoutCashApp**

Import and render `CashAppInfoSection` at the bottom of the `CheckoutCashApp` component, after the Cash App Pay button area.

**Step 3: Verify it renders**

Open http://localhost:3000/checkout, select Cash App Pay tab, scroll down — the info section should be visible and expandable.

**Step 4: Commit**

```bash
git add components/CashAppInfoSection.tsx components/CheckoutCashApp.tsx
git commit -m "feat: add Cash App Pay developer info section"
```

---

### Task 6: Handle mobile redirect return

**Files:**
- Modify: `app/confirmation/page.tsx:25-98`

**Step 1: Add mobile redirect detection**

In the `ConfirmationContent` component's `useEffect` (around line 25), add handling for Cash App Pay mobile redirect return. Check for `cashAppPay=true` query param:

```typescript
const isCashAppPayReturn = searchParams.get("cashAppPay") === "true";
const cashAppToken = searchParams.get("orderToken");

if (isCashAppPayReturn && cashAppToken && !hasProcessed.current) {
  hasProcessed.current = true;
  // Initialize Cash App Pay listeners for mobile return
  const initListeners = () => {
    if (window.Afterpay?.initializeCashAppPayListeners) {
      window.Afterpay.initializeCashAppPayListeners({
        onComplete: async (event) => {
          if (event.data.status === "SUCCESS") {
            // Process auth/capture same as desktop flow
            // Retrieve pending order data from sessionStorage
            // Auth -> optional capture -> show confirmation
          } else {
            setError("Cash App Pay was cancelled");
          }
        },
      });
    } else {
      setTimeout(initListeners, 100);
    }
  };
  initListeners();
  return;
}
```

**Step 2: Update the checkout route redirectConfirmUrl for Cash App Pay**

In `app/api/afterpay/checkout/route.ts`, when `isCashAppPay` is true, set the `redirectConfirmUrl` to include the `cashAppPay=true` param:

```typescript
const redirectConfirmUrl = isCashAppPay
  ? `${appUrl}/confirmation?cashAppPay=true`
  : mode === "standard"
    ? `${appUrl}/checkout/review`
    : `${appUrl}/confirmation`;
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/confirmation/page.tsx app/api/afterpay/checkout/route.ts
git commit -m "feat: handle Cash App Pay mobile redirect return"
```

---

### Task 7: Update flow logging for Cash App Pay

**Files:**
- Modify: `lib/flowLogs.ts` (if needed — add Cash App Pay flow name formatting)

**Step 1: Check if `formatFlowName` handles Cash App Pay flows**

Read `lib/flowLogs.ts` and check how `formatFlowName` works. If it uses a map of flow names, add entries for:
- `"cashapp-deferred"` → `"Cash App Pay (Deferred Capture)"`
- `"cashapp-immediate"` → `"Cash App Pay (Immediate Capture)"`

**Step 2: Add flow summary support for Cash App Pay**

If the `FlowSummary` builder needs updates to support Cash App Pay flow descriptions and docs URLs, add them.

**Step 3: Verify by running a Cash App Pay flow**

Manually test: complete a Cash App Pay checkout and verify the confirmation page shows correct flow logs with proper flow name.

**Step 4: Commit**

```bash
git add lib/flowLogs.ts
git commit -m "feat: add Cash App Pay flow name to flow logging"
```

---

### Task 8: Run all tests and verify

**Files:**
- All test files

**Step 1: Run the full test suite**

Run: `npx jest --verbose 2>&1`
Expected: All tests pass.

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1`
Expected: No errors.

**Step 3: Run lint**

Run: `npx eslint . 2>&1 | tail -20`
Expected: No new errors.

**Step 4: Manual end-to-end test**

1. Open http://localhost:3000
2. Add a product to cart
3. Go to checkout
4. Select "Cash App Pay" tab
5. Fill shipping form
6. Click Cash App Pay button
7. Verify QR code appears (desktop) or redirect works (mobile)
8. Complete sandbox payment
9. Verify confirmation page shows correct flow logs
10. Verify admin panel can capture/void the order (deferred mode)

**Step 5: Verify existing flows still work**

1. Test Express Checkout (integrated shipping)
2. Test Express Checkout (deferred shipping)
3. Test Standard Checkout (redirect)
4. Test Standard Checkout (popup)

All should work exactly as before.

---

### Task 9: Final commit and summary

**Step 1: Review all changes**

Run: `git log --oneline feature/cash-app-pay --not main`
Review all commits are clean and focused.

**Step 2: Run full verification one more time**

Run: `npx jest --verbose && npx tsc --noEmit`
Expected: All pass.

**Step 3: Summary of what was built**

Report to user:
- New files created
- Files modified
- Test results
- What to test manually before merging
- Branch is ready for review

Do NOT push to main. The branch stays as `feature/cash-app-pay` until user confirms.
