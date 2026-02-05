# RequestId Idempotency Support Design

**Date:** 2026-02-05
**Status:** Approved

## Overview

Add `requestId` parameter to all payment operations (auth, capture, capture-full, refund, void) to enable idempotent requests and safe retries on timeout/network failures.

## Goals

1. Enable safe retries when requests timeout
2. Prevent duplicate charges/refunds on network failures
3. Display requestId in Developer Panel for debugging
4. Document the idempotency pattern for developers

## Design

### Core Library Changes (`lib/afterpay.ts`)

Update 5 payment functions to require `requestId`:

```typescript
// Auth
export async function authorizePayment(
  token: string,
  requestId: string,
  amount?: Money,
  options?: AuthOptions
): Promise<AuthResponse>

// Capture (partial)
export async function capturePayment(
  orderId: string,
  requestId: string,
  options: CaptureOptions
): Promise<CaptureResponse>

// Capture Full (immediate mode)
export async function captureFullPayment(
  token: string,
  requestId: string,
  merchantReference?: string
): Promise<CaptureResponse>

// Refund
export async function refundPayment(
  orderId: string,
  requestId: string,
  amount: Money,
  merchantReference?: string
): Promise<RefundResponse>

// Void
export async function voidPayment(
  orderId: string,
  requestId: string,
  amount: Money
): Promise<CaptureResponse>
```

Each function includes `requestId` in the request body sent to Afterpay API.

### API Route Updates

Each API route generates `requestId` using `crypto.randomUUID()` and passes it to the lib function. The `requestId` is included in `_meta` for Developer Panel display.

Routes to update:
- `/api/afterpay/auth/route.ts`
- `/api/afterpay/capture/route.ts`
- `/api/afterpay/capture-full/route.ts`
- `/api/afterpay/refund/route.ts`
- `/api/afterpay/void/route.ts`

### Developer Panel Display

Show `requestId` prominently in expanded event details:
- Extract from `log.data?.requestBody?.requestId` or `log.data?._meta?.requestId`
- Display as labeled field with monospace font
- Include in cURL export command

### Documentation Updates

1. **how-to-use.md** - Add requestId to API examples with idempotency explanation
2. **CHANGELOG.md** - Document new feature and all recent session updates
3. **docs/plans/roadmap.md** - Add future retry logic enhancement task

## Future Enhancement (Roadmap)

### Retry Logic & Idempotency Demo
- Configurable retry attempts with exponential backoff
- Timeout simulation toggle in Admin Panel
- Visual demonstration of idempotent responses
- Auth reversal edge case scenarios

## Files to Modify

1. `lib/afterpay.ts`
2. `app/api/afterpay/auth/route.ts`
3. `app/api/afterpay/capture/route.ts`
4. `app/api/afterpay/capture-full/route.ts`
5. `app/api/afterpay/refund/route.ts`
6. `app/api/afterpay/void/route.ts`
7. `components/FlowLogsDevPanel.tsx`
8. `how-to-use.md`
9. `CHANGELOG.md`
10. `docs/plans/roadmap.md`
