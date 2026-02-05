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
  /checkout               # Checkout page (Express/Standard tabs)
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
    └─► Standard Tab
          │
          ├─► Redirect: Create → Redirect → Return → Review → Auth → [Capture] → Confirmation
          │
          └─► Popup: Create → Popup → Auth → [Capture] → Confirmation
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
3. Add flow summary definition with description, steps, docs URL
4. Update confirmation page if new display needed

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
