# Documentation Audit Design

**Date:** 2026-02-04
**Purpose:** Full documentation audit to reflect current app state and improve structure

---

## Overview

Audit all documentation to:
1. Update existing docs with latest features (FlowSummarySection, Pay Monthly OSM)
2. Create missing documentation (CHANGELOG, ARCHITECTURE)
3. Reorganize docs folder (archive completed designs)
4. Split audience: external demo users vs internal maintainers
5. Remove GitHub/local setup from user-facing docs

## Audience Split

| Document | Audience | Access |
|----------|----------|--------|
| how-to-use.md | External (demo users) | In-app at `/docs` |
| README.md | Internal (maintainers) | Repo only |
| ARCHITECTURE.md | Internal (maintainers) | Repo only |
| CHANGELOG.md | Both | Repo (could link from app) |

---

## New Documents

### 1. CHANGELOG.md

**Location:** `/CHANGELOG.md`

**Format:** Reverse chronological, grouped by type (Added, Changed, Fixed, Security)

**Content:**

```markdown
# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- Integration Flow Summary on confirmation page
  - Flow description and steps
  - Request configuration with doc links
  - Checkout adjustment details (deferred shipping)
  - Response data display
  - Copy button with JSON export
- Pay Monthly messaging option for OSM

## [2.0.0] - 2026-02-04

### Added
- In-app documentation viewer at `/docs` with TOC navigation
- Webhook handler demo in Admin Panel
- Order history page (`/orders`) with individual deletion
- Developer panel enhancements:
  - Resizable panel (drag to adjust, persisted to localStorage)
  - Collapsed by default
  - Reverse chronological order
  - Copy as cURL
  - Export as JSON/HAR
- Dark mode with system preference detection
- Grouped navigation (Demo | Tools) with mobile slide-out menu
- Official Cash App Afterpay branding from CDN
- Checkout progress timeline component
- Error boundary components for graceful error handling

### Security
- Input validation with Zod schemas on all API routes
- Error message sanitization in API responses
- HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)

### Testing
- Jest test suite: 55 tests, 99.63% coverage on lib utilities
- Validation schema tests
- Error handling tests

## [1.0.0] - Initial Release

### Added
- Express Checkout with Afterpay.js
  - Integrated shipping (select in popup)
  - Deferred shipping (select on merchant site)
- Standard Checkout with API
  - Redirect flow (full page navigation)
  - Popup flow (modal overlay)
- Payment Admin Panel (`/admin`)
  - Payment lookup by Order ID
  - Capture (full and partial)
  - Refund (full and partial)
  - Void authorization
  - Amount breakdown visualization
- On-Site Messaging (OSM) integration
  - Product detail pages
  - Cart page
  - Checkout page
- Deferred/Immediate capture mode toggle
- Developer Panel with API request/response logging
- Code Viewer with implementation snippets
```

---

### 2. ARCHITECTURE.md

**Location:** `/ARCHITECTURE.md`

**Content:**

```markdown
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
```

---

## Updates to Existing Documents

### README.md Changes

**Add at top:**
```markdown
> **Demo Users:** Visit the live demo at [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)
> and see [how-to-use.md](./how-to-use.md) for testing instructions.
>
> This README is for developers maintaining or extending this project.
```

**Update Features section - add:**
```markdown
### Integration Flow Summary
On the confirmation page, view a summary of your checkout flow including:
- Flow description and steps executed
- Critical request configuration (mode, popupOriginUrl, checksums)
- Checkout adjustment breakdown (deferred shipping flows)
- Key response data with links to Afterpay documentation
- Copy button for sharing flow configuration
```

**Update Roadmap - Completed section - add:**
```markdown
- [x] Integration Flow Summary on confirmation page
- [x] Pay Monthly messaging option for OSM
- [x] Documentation restructure
```

---

### how-to-use.md Changes

**Remove from Quick Start:**
- "Option 2: Run Locally" section entirely
- Clone instructions
- npm install instructions
- Environment variables references

**Update Quick Start to:**
```markdown
## Quick Start

**Try the demo at: [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)**

1. Visit the live demo
2. Add products to cart
3. Go to Checkout and test different flows
4. Use sandbox credentials to complete checkout

### Sandbox Test Account

You can create test customer accounts in the sandbox environment within your test checkout flow:

- **Email**: Use any unique email address
- **Phone**: Use any phone number
- **Verification Code**: Use `111111` (no SMS messages are sent in sandbox)

See [Test Customer Accounts](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#test-customer-accounts) for more details.
```

**Add new section in Part 5 (Developer Tools) after Developer Panel:**

```markdown
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
```

---

### /docs Page Code Change

**File:** `app/docs/page.tsx`

Remove README tab. Show only How-to-Use guide with simplified header.

**Changes:**
1. Remove tab interface (README / How to Use tabs)
2. Load only how-to-use.md content
3. Update header text to "Documentation" or "User Guide"
4. Keep TOC sidebar, section highlighting, quick links

---

## Docs Folder Restructure

### Create Archive Folder

```
docs/
├── plans/
│   └── roadmap.md                    # Renamed from 2026-02-04-app-analysis-and-roadmap.md
│
└── archive/
    ├── README.md                     # Index of archived docs
    ├── integration-flow-summary-design.md
    ├── how-to-use-restructure-design.md
    └── documentation-review-design.md
```

### Archive README Content

```markdown
# Archived Design Documents

Completed design documents preserved for reference. These features have been implemented.

| Document | Feature | Completed |
|----------|---------|-----------|
| integration-flow-summary-design.md | Flow Summary on confirmation page | 2026-02-04 |
| how-to-use-restructure-design.md | Documentation reorganization | 2026-02-04 |
| documentation-review-design.md | Doc review & header UI updates | 2026-02-04 |
| documentation-audit-design.md | Full documentation audit | 2026-02-04 |
```

### Files to Delete

- `docs/plans/2026-02-04-developer-panel-resize-fix.md` - Trivial fix, not worth preserving

---

## Implementation Tasks

| # | Task | Type | Files |
|---|------|------|-------|
| 1 | Create CHANGELOG.md | New | `/CHANGELOG.md` |
| 2 | Create ARCHITECTURE.md | New | `/ARCHITECTURE.md` |
| 3 | Update README.md | Edit | `/README.md` |
| 4 | Update how-to-use.md | Edit | `/how-to-use.md` |
| 5 | Update /docs page (remove README tab) | Code | `app/docs/page.tsx` |
| 6 | Create docs/archive/ folder | New | `docs/archive/README.md` |
| 7 | Move completed design docs | Move | `docs/plans/*.md` → `docs/archive/` |
| 8 | Rename roadmap file | Rename | `2026-02-04-app-analysis...` → `roadmap.md` |
| 9 | Delete resize fix doc | Delete | `docs/plans/2026-02-04-developer-panel-resize-fix.md` |
| 10 | Update release-summary.md | Edit | `docs/plans/2026-02-04-release-summary.md` |

---

## Success Criteria

- [ ] CHANGELOG.md exists with version history
- [ ] ARCHITECTURE.md exists with technical overview
- [ ] README.md marked as internal, links to live demo for users
- [ ] how-to-use.md has no GitHub/local setup references
- [ ] how-to-use.md includes Integration Flow Summary section
- [ ] /docs page shows only How-to-Use guide (no README tab)
- [ ] Completed design docs moved to docs/archive/
- [ ] Roadmap file renamed and updated
- [ ] All verification checklists pass
