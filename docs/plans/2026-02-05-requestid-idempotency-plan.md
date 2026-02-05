# RequestId Idempotency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `requestId` parameter to all payment operations for idempotent requests and safe retries.

**Architecture:** Generate UUID at API route level, pass to lib functions, include in request body to Afterpay API, display in Developer Panel.

**Tech Stack:** Node.js crypto.randomUUID(), TypeScript, Next.js API routes

---

## Task 1: Update lib/afterpay.ts - authorizePayment

**Files:**
- Modify: `lib/afterpay.ts:76-104`

**Step 1: Update function signature**

Change `authorizePayment` to require `requestId` as second parameter:

```typescript
export async function authorizePayment(
  token: string,
  requestId: string,
  amount?: Money,
  options?: AuthOptions
): Promise<AuthResponse> {
  const body: {
    token: string;
    requestId: string;
    amount?: Money;
    isCheckoutAdjusted?: boolean;
    paymentScheduleChecksum?: string;
  } = { token, requestId };

  if (amount) {
    body.amount = amount;
  }

  // Include adjustment fields for deferred shipping flow
  if (options?.isCheckoutAdjusted) {
    body.isCheckoutAdjusted = true;
    if (options.paymentScheduleChecksum) {
      body.paymentScheduleChecksum = options.paymentScheduleChecksum;
    }
  }

  return afterpayFetch<AuthResponse>("/v2/payments/auth", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors about missing `requestId` argument in callers (this is expected)

---

## Task 2: Update lib/afterpay.ts - capturePayment

**Files:**
- Modify: `lib/afterpay.ts:112-134`

**Step 1: Update function signature**

```typescript
export async function capturePayment(
  orderId: string,
  requestId: string,
  options: CaptureOptions
): Promise<CaptureResponse> {
  const body: {
    requestId: string;
    amount: Money;
    isCheckoutAdjusted?: boolean;
    paymentScheduleChecksum?: string;
  } = { requestId, amount: options.amount };

  // Include adjustment fields for deferred shipping flow
  if (options.isCheckoutAdjusted) {
    body.isCheckoutAdjusted = true;
    if (options.paymentScheduleChecksum) {
      body.paymentScheduleChecksum = options.paymentScheduleChecksum;
    }
  }

  return afterpayFetch<CaptureResponse>(`/v2/payments/${orderId}/capture`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

---

## Task 3: Update lib/afterpay.ts - captureFullPayment

**Files:**
- Modify: `lib/afterpay.ts:204-216`

**Step 1: Update function signature**

```typescript
export async function captureFullPayment(
  token: string,
  requestId: string,
  merchantReference?: string
): Promise<CaptureResponse> {
  const body: { token: string; requestId: string; merchantReference?: string } = { token, requestId };
  if (merchantReference) {
    body.merchantReference = merchantReference;
  }
  return afterpayFetch<CaptureResponse>("/v2/payments/capture", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

---

## Task 4: Update lib/afterpay.ts - refundPayment

**Files:**
- Modify: `lib/afterpay.ts:153-166`

**Step 1: Update function signature**

```typescript
export async function refundPayment(
  orderId: string,
  requestId: string,
  amount: Money,
  merchantReference?: string
): Promise<RefundResponse> {
  const body: { requestId: string; amount: Money; merchantReference?: string } = { requestId, amount };
  if (merchantReference) {
    body.merchantReference = merchantReference;
  }
  return afterpayFetch<RefundResponse>(`/v2/payments/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

---

## Task 5: Update lib/afterpay.ts - voidPayment

**Files:**
- Modify: `lib/afterpay.ts:136-144`

**Step 1: Update function signature**

```typescript
export async function voidPayment(
  orderId: string,
  requestId: string,
  amount: Money
): Promise<CaptureResponse> {
  return afterpayFetch<CaptureResponse>(`/v2/payments/${orderId}/void`, {
    method: "POST",
    body: JSON.stringify({ requestId, amount }),
  });
}
```

**Step 2: Verify all lib functions updated**

Run: `npx tsc --noEmit`
Expected: Errors in API routes (callers need updating)

---

## Task 6: Update /api/afterpay/auth route

**Files:**
- Modify: `app/api/afterpay/auth/route.ts`

**Step 1: Add crypto import and generate requestId**

```typescript
import { randomUUID } from "crypto";
// ... existing imports

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ... validation code stays the same

    // Build request body for logging - add requestId
    const requestBody: Record<string, unknown> = { requestId, token, amount: authAmount };
    // ... rest of requestBody building

    // Pass requestId to authorizePayment
    const response = await authorizePayment(token, requestId, authAmount, {
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });

    // Include requestId in _meta
    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        fullUrl: `${API_URL}/v2/payments/auth`,
        // ... rest stays the same
      },
    });
  } catch (error) {
    // ... error handling stays the same
  }
}
```

---

## Task 7: Update /api/afterpay/capture route

**Files:**
- Modify: `app/api/afterpay/capture/route.ts`

**Step 1: Add crypto import and generate requestId**

```typescript
import { randomUUID } from "crypto";
// ... existing imports

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ... validation stays the same

    const requestBody: Record<string, unknown> = { requestId, amount: captureAmount };
    // ... rest of requestBody building

    const response = await capturePayment(orderId, requestId, {
      amount: captureAmount,
      isCheckoutAdjusted,
      paymentScheduleChecksum,
    });

    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        // ... rest stays the same
      },
    });
  } catch (error) {
    // ...
  }
}
```

---

## Task 8: Update /api/afterpay/capture-full route

**Files:**
- Modify: `app/api/afterpay/capture-full/route.ts`

**Step 1: Add crypto import and generate requestId**

```typescript
import { randomUUID } from "crypto";
// ... existing imports

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ... validation stays the same

    const requestBody: Record<string, unknown> = { requestId, token };
    if (merchantReference) {
      requestBody.merchantReference = merchantReference;
    }

    const response = await captureFullPayment(token, requestId, merchantReference);

    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        // ... rest stays the same
      },
    });
  } catch (error) {
    // ...
  }
}
```

---

## Task 9: Update /api/afterpay/refund route

**Files:**
- Modify: `app/api/afterpay/refund/route.ts`

**Step 1: Add crypto import and generate requestId**

```typescript
import { randomUUID } from "crypto";
// ... existing imports

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ... validation stays the same

    const requestBody: Record<string, unknown> = { requestId, amount: refundAmount };
    if (merchantReference) {
      requestBody.merchantReference = merchantReference;
    }

    const response = await refundPayment(orderId, requestId, refundAmount, merchantReference);

    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        // ... rest stays the same
      },
    });
  } catch (error) {
    // ...
  }
}
```

---

## Task 10: Update /api/afterpay/void route

**Files:**
- Modify: `app/api/afterpay/void/route.ts`

**Step 1: Add crypto import and generate requestId**

```typescript
import { randomUUID } from "crypto";
// ... existing imports

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = randomUUID();

  try {
    // ... validation stays the same

    const requestBody = { requestId, amount: voidAmount };

    const response = await voidPayment(orderId, requestId, voidAmount);

    return NextResponse.json({
      ...response,
      _meta: {
        requestId,
        // ... rest stays the same
      },
    });
  } catch (error) {
    // ...
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

---

## Task 11: Update FlowLogsDevPanel to display requestId

**Files:**
- Modify: `components/FlowLogsDevPanel.tsx`

**Step 1: Find the expanded event detail section and add requestId display**

In the section where event details are shown (inside the expandable card), add:

```tsx
{/* Request ID - shown prominently for idempotency debugging */}
{(log.data?.requestBody?.requestId || log.data?._meta?.requestId) && (
  <div className="mb-3 p-2 bg-afterpay-gray-800 rounded">
    <span className="text-xs text-afterpay-gray-400">Request ID: </span>
    <code className="text-xs text-afterpay-mint font-mono">
      {log.data?.requestBody?.requestId || log.data?._meta?.requestId}
    </code>
  </div>
)}
```

**Step 2: Verify the display works**

Run: `npm run dev`
Test: Make a capture/refund/void in Admin Panel, expand the event in Developer Panel
Expected: Request ID displayed with monospace font

---

## Task 12: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Add comprehensive changelog entry**

Add under `## [Unreleased]`:

```markdown
### Added
- Idempotency support via `requestId` for payment operations
  - Auth, Capture, Capture Full, Refund, and Void requests
  - Enables safe retries on timeout/network failures
  - Request ID visible in Developer Panel event details

### Changed
- Developer Panel header redesign
  - Center-aligned title with bold styling for better visibility
  - Event count badge and flow type displayed inline
  - Resize tooltip appears on header hover
  - Improved resize handle with higher z-index for reliable drag
- Afterpay messaging widget prevented from wrapping (CSS fix)
- Afterpay.js SDK check verifies `initializeForPopup` availability

### Fixed
- Amount Breakdown calculation in Admin Panel
  - Refund calculation correctly excludes void events
  - Afterpay API returns voids in `refunds` array with matching event IDs
  - Now filters by checking `refundId` against `events[].id`
- Event History no longer shows duplicate entries for voids
```

---

## Task 13: Update roadmap.md with future enhancement

**Files:**
- Modify: `docs/plans/roadmap.md`

**Step 1: Add retry logic enhancement to backlog**

Add new section after E15:

```markdown
#### E16: Retry Logic & Idempotency Demo
**Status:** OPEN
**Value:** Demonstrates safe retry patterns using requestId idempotency
**Effort:** Medium
**Files:**
- Create: `lib/retry.ts` (retry utility with exponential backoff)
- Create: `components/TimeoutSimulator.tsx` (toggle in Admin Panel)
- Modify: `app/admin/page.tsx` (add timeout simulation UI)
- Modify: All API routes (integrate retry logic)

**Features:**
- Configurable retry attempts with exponential backoff
- Timeout simulation toggle in Admin Panel
- Visual demonstration of idempotent responses
- Auth reversal edge case scenarios
```

---

## Task 14: Update how-to-use.md with requestId documentation

**Files:**
- Modify: `how-to-use.md`

**Step 1: Add idempotency section to API Reference**

Add section explaining requestId usage:

```markdown
### Idempotency with requestId

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
```

---

## Task 15: Build and test

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Manual testing**

1. Start dev server: `npm run dev`
2. Go to Admin Panel (`/admin`)
3. Look up a payment
4. Perform a capture action
5. Expand the event in Developer Panel
6. Verify Request ID is displayed

**Step 4: Commit all changes**

```bash
git add -A
git commit -m "feat: add requestId idempotency support for payment operations

- Add requestId parameter to auth, capture, capture-full, refund, void
- Generate UUID at API route level for safe retry support
- Display requestId in Developer Panel event details
- Update documentation with idempotency patterns
- Add future retry logic enhancement to roadmap

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1-5 | Update lib/afterpay.ts functions | `lib/afterpay.ts` |
| 6-10 | Update API routes | `app/api/afterpay/*/route.ts` |
| 11 | Developer Panel requestId display | `components/FlowLogsDevPanel.tsx` |
| 12 | CHANGELOG update | `CHANGELOG.md` |
| 13 | Roadmap future enhancement | `docs/plans/roadmap.md` |
| 14 | Documentation | `how-to-use.md` |
| 15 | Build, test, commit | - |
