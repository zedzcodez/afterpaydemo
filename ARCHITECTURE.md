# Architecture Overview

Technical guide for developers maintaining or extending this demo.

---

## System Overview

- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS with custom design tokens
- **State:** React Context + localStorage/sessionStorage
- **Database:** None - client-side persistence only
- **Deployment:** Vercel

---

## Directory Structure

```
/app
  layout.tsx              # Root layout with providers
  page.tsx                # Homepage (product grid)
  /products/[id]          # Product detail page
  /cart                   # Shopping cart
  /checkout               # Checkout page (Express/Standard/Cash App Pay tabs)
  /checkout/shipping      # Deferred shipping selection
  /checkout/review        # Standard checkout review
  /confirmation           # Order confirmation + flow logs
  /admin                  # Payment management panel
  /orders                 # Order history
  /docs                   # In-app documentation
  /api/afterpay/*         # Afterpay API proxy routes
  /api/webhooks/afterpay  # Webhook endpoint
  /api/docs/*             # Documentation content API

/components
  CartProvider.tsx        # Cart state + animation triggers
  ThemeProvider.tsx       # Dark mode state
  Header.tsx              # Navigation
  CheckoutExpress.tsx     # Express checkout component
  CheckoutStandard.tsx    # Standard checkout component
  CheckoutCashApp.tsx     # Cash App Pay checkout component
  CashAppInfoSection.tsx  # Cash App Pay developer docs/code snippets
  FlowLogsDevPanel.tsx    # Developer panel
  OSMPlacement.tsx        # On-site messaging wrapper

/lib
  afterpay.ts             # Server-side Afterpay API client
  flowLogs.ts             # Flow logging utilities
  cart.ts                 # Cart utilities
  orders.ts               # Order persistence
  validation.ts           # Zod schemas
  errors.ts               # Error sanitization
```

---

## Key Data Flows

### Checkout Flow

```
Cart Page
    │
    ▼
Checkout Page (/checkout)
    │
    ├─► Express Tab
    │     │
    │     ├─► Integrated: Popup → Auth → [Capture] → Confirmation
    │     │
    │     └─► Deferred: Popup → Shipping Page → Auth → [Capture] → Confirmation
    │
    ├─► Standard Tab
    │     │
    │     ├─► Redirect: Create → Redirect → Return → Review → Auth → [Capture] → Confirmation
    │     │
    │     └─► Popup: Create → Popup → Auth → [Capture] → Confirmation
    │
    └─► Cash App Pay Tab
          └─► Form → Create (isCashAppPay) → SDK Init → QR/Redirect → Auth → [Capture] → Confirmation
```

### State Persistence

| Data | Storage | Lifetime | Purpose |
|------|---------|----------|---------|
| Cart items | localStorage | Until cleared | Shopping cart |
| Capture mode | localStorage | Permanent | Deferred vs immediate |
| Order history | localStorage | Last 20 orders | Order tracking |
| Flow logs | sessionStorage | Current session | API logging |
| Flow summary | sessionStorage | Current session | Confirmation display |
| Theme preference | localStorage | Permanent | Dark/light mode |
| Dev panel height | localStorage | Permanent | UI preference |
| Cash App token | In-memory ref | Component lifetime | Token reuse across tab switches |

---

## Key Patterns

### Flow Logging

**File:** `lib/flowLogs.ts`

Captures API interactions during checkout for display on confirmation page.

```typescript
// Initialize at checkout start
initFlowLogs('express-integrated');

// Log API calls (called from API routes via _meta)
addFlowLog({
  type: 'api_request',
  label: 'POST /v2/checkouts',
  method: 'POST',
  endpoint: '/v2/checkouts',
  data: requestBody,
});

// Set summary at checkout completion
setFlowSummary({
  flow: 'express-integrated',
  description: '...',
  steps: ['Create Checkout', 'Afterpay Popup', 'Authorize'],
  requestConfig: { mode: 'express', ... },
  responseData: { token: '...', id: '...', status: 'APPROVED' },
});
```

### API Route Pattern

All `/api/afterpay/*` routes follow this pattern:

```typescript
export async function POST(request: Request) {
  // 1. Parse and validate input
  const body = await request.json();
  const validated = schema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  // 2. Call Afterpay API
  const response = await afterpayClient.createCheckout(validated.data);

  // 3. Return response with _meta for flow logging
  return NextResponse.json({
    ...response,
    _meta: {
      request: requestBody,  // What was sent to Afterpay
      url: fullUrl,
      method: 'POST',
    },
  });
}
```

### Capture Mode Toggle

```typescript
// Read preference
const mode = localStorage.getItem('afterpay_capture_mode') || 'deferred';

// Deferred: Auth only, capture later from Admin
// Immediate: Auth + capture in single flow
```

### SDK Lifecycle Management (Always-Mounted Pattern)

All checkout components stay mounted in the DOM using CSS `display:none` instead of conditional rendering. An `isActive` prop controls SDK lifecycle per tab.

**Why:** The Afterpay SDK (`window.Afterpay`) is a global singleton. Conditional rendering unmounts components (destroying React state), but the SDK's state persists. This mismatch causes form data loss, stale DOM references, and button rendering failures on tab switch.

**Pattern:**
```typescript
// Parent: Always-mounted with CSS visibility
<div style={{ display: method === "cashapp" ? undefined : "none" }}>
  <CheckoutCashApp isActive={method === "cashapp"} />
</div>

// Child: isActive controls SDK lifecycle
useEffect(() => {
  if (!isActive) {
    restartCashAppPay();  // Clean up SDK state
    return;
  }
  // Re-initialize with saved token on activation
  if (savedTokenRef.current) {
    setPendingToken(savedTokenRef.current);
  }
}, [isActive]);
```

**Key rule:** After `restartCashAppPay()`, always call `renderCashAppPayButton()` before `initializeForCashAppPay()`. The restart removes all UI; the button must be explicitly re-rendered.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AFTERPAY_API_URL` | Yes | Afterpay API base URL |
| `AFTERPAY_MERCHANT_ID` | Yes | Merchant ID for auth |
| `AFTERPAY_SECRET_KEY` | Yes | Secret key for auth |
| `NEXT_PUBLIC_AFTERPAY_MPID` | Yes | OSM Merchant Profile ID |
| `NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID` | Yes | OSM placement for product pages |
| `NEXT_PUBLIC_OSM_CART_PLACEMENT_ID` | Yes | OSM placement for cart/checkout |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (must match exactly for popup) |

**Critical:** `NEXT_PUBLIC_APP_URL` must exactly match `window.location.origin` for popup flows to work.

---

## Extending the Demo

### Adding a New Checkout Flow

1. Add flow type to `lib/flowLogs.ts` types
2. Create component or modify existing in `/components`
3. Add tab and always-mounted wrapper in `app/checkout/page.tsx` with `isActive` prop
4. Add flow summary definition with description, steps, docs URL
5. Update confirmation page if new display needed
6. If the flow uses an SDK that modifies global state, implement `isActive` lifecycle (see SDK Lifecycle Management above)

### Adding a New Admin Operation

1. Create API route in `/app/api/afterpay/`
2. Add Zod validation schema in `lib/validation.ts`
3. Add UI in `/app/admin/page.tsx`
4. Update flow logging if needed

### Modifying Flow Logging

1. Update `FlowLogEntry` interface in `lib/flowLogs.ts`
2. Update `FlowSummary` interface if adding summary fields
3. Update `FlowLogsDevPanel` component for display changes
4. Update `FlowSummarySection` for summary display changes
