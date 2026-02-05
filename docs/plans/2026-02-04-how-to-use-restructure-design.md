# How-to-Use Documentation Restructure

**Date:** 2026-02-04
**Purpose:** Reorganize documentation to prioritize Afterpay functionality for merchants and developers
**Aesthetic Direction:** Technical Editorial - clean, precise, scannable with subtle refinement

---

## Design Principles

### Information Architecture
- **Part → Section → Subsection** hierarchy (3 levels max)
- Merchants can scan "At a Glance" and flow summaries
- Developers can dive into API details and code examples
- Testing integrated inline, not buried at the end

### Visual Patterns
- **Flow Diagrams**: ASCII-style boxes showing API sequence with local↔Afterpay mapping
- **Quick Reference Tables**: Feature summaries at section starts
- **Callout Blocks**: Tips, warnings, and "Common Patterns"
- **Inline Verification**: Collapsible test checklists per feature

---

## Proposed Structure

```
# How to Use This Demo

## At a Glance (NEW)
   [Feature overview table - 30 second scan]
   [Common patterns callout box]

## Part 1: Getting Started
   ### Quick Start
       - Live Demo option
       - Run Locally option
       - Sandbox Test Account

## Part 2: Afterpay Payment Features
   ### On-Site Messaging (OSM)
       - What It Does
       - Where to Test [table]
       - How to Test
       - Technical Details
       - ✓ Verify [inline checklist]

   ### Express Checkout
       - API Flow Overview [diagram with Afterpay URLs]
       #### Integrated Shipping
           - What It Does
           - How to Test
           - Technical Details
           - ✓ Verify
       #### Deferred Shipping
           - What It Does
           - How to Test
           - Payment Schedule Widget
           - Technical Details
           - ✓ Verify

   ### Standard Checkout
       - API Flow Overview [diagram with Afterpay URLs]
       #### Redirect Flow
           - What It Does
           - How to Test
           - Technical Details
           - ✓ Verify
       #### Popup Flow
           - What It Does
           - How to Test
           - Critical: popupOriginUrl
           - Technical Details
           - ✓ Verify

   ### Capture Modes
       - How to Toggle
       #### Deferred Capture (Default)
           - Use Cases
           - Flow
           - API Details
       #### Immediate Capture
           - Use Cases
           - Flow
           - API Details
       - ✓ Verify

## Part 3: Payment Operations
   ### Payment Admin Panel
       - URL & Features Overview
       - Merchant Configuration
       - Payment Lookup
       - Amount Breakdown
       - Actions (Capture/Refund/Void) [table]
       - Event History
       - Technical Details
       - ✓ Verify

   ### Webhook Handler
       - Endpoint Info
       - How to Test
       - Supported Events [table]
       - Production Notes
       - Technical Details

   ### Order History
       - URL & Features
       - How to Use
       - Cart Clearing Behavior [table]
       - Technical Details
       - ✓ Verify

## Part 4: API Reference
   ### Local to Afterpay API Mapping [consolidated table]
   ### API Flow Diagrams
       - Express Checkout Flow
       - Standard Checkout - Redirect Flow
       - Standard Checkout - Popup Flow
       - Capture/Refund/Void Flow
   ### Test Credentials
       - Sandbox Account Setup
       - Test Credit Cards [table]
   ### Troubleshooting
       - Common Issues [existing content]

## Part 5: Developer Tools
   ### Developer Panel
       - What It Does
       - Where to Find
       - Information Shown
       - Panel Features
           - Resizable Panel
           - Display Order
           - Filter & Search
           - Collapsible Sections
           - Copy as cURL
           - Export Logs
       - ✓ Verify

   ### Code Viewer
       - What It Does
       - Where to Find
       - Features

   ### Technical Files Reference [table]

## Part 6: App Customization
   ### Settings & Preferences
       #### Dark Mode
           - How to Toggle
           - Features [table]
           - Technical Details
           - Supported Components
           - ✓ Verify

   ### Navigation
       - Desktop Navigation
       - Mobile Navigation
       - Active State Indicators
       - Technical Details
       - ✓ Verify

   ### Design System
       - Typography [table]
       - Color Palette [table]
       - Button Styles
       - Form Styles
       - Animation Effects [table]
       - Technical Files [table]

   ### UI Components
       - Checkout Progress Timeline
       - Loading States
       - Micro-interactions
       - Form Input Styling
       - Admin Amount Visualization

   ### In-App Documentation
       - Features
       - How to Use
       - Technical Details
       - ✓ Verify

## Afterpay Resources
   [Links to official documentation]
```

---

## New Content Blocks

### 1. At a Glance Table

```markdown
## At a Glance

| Feature | What It Does | Demo URL | Afterpay Docs |
|---------|--------------|----------|---------------|
| On-Site Messaging | "Pay in 4" installment badges | `/products/1` | [OSM Guide][osm] |
| Express Checkout | Popup checkout with shipping options | `/checkout` | [Express Guide][express] |
| Standard Checkout | Redirect or popup to Afterpay | `/checkout` | [API Quickstart][api] |
| Deferred Capture | Authorize now, capture later | `/admin` | [Deferred Guide][deferred] |
| Payment Admin | Capture, refund, void payments | `/admin` | [Payments API][payments] |
| Webhooks | Async payment notifications | `/admin` | [Webhooks][webhooks] |
| Order History | Track completed orders | `/orders` | - |

[osm]: https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging
[express]: https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout
[api]: https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart
[deferred]: https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture
[payments]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments
[webhooks]: https://developers.cash.app/cash-app-afterpay/guides/api-development/webhook-signature-generation
```

### 2. Common Patterns Callout

```markdown
> **Common Patterns Across All Flows**
>
> - **Amount Format**: Always `{ amount: "10.00", currency: "USD" }` (string with 2 decimals)
> - **Token Flow**: Checkout Token → Order Token (from redirect) → Order ID (after auth)
> - **Error Handling**: All API routes return `{ error: string }` on failure
> - **Sandbox Base URL**: `https://global-api-sandbox.afterpay.com`
```

### 3. API Flow Diagram Format

```markdown
### Standard Checkout - Redirect Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STANDARD CHECKOUT - REDIRECT FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Create Checkout                                                         │
│     LOCAL:    POST /api/afterpay/checkout                                   │
│     AFTERPAY: POST /v2/checkouts                                            │
│     DOCS:     https://developers.cash.app/.../checkouts/create-checkout-1   │
│                                                                             │
│  2. Redirect Customer                                                       │
│     → redirectCheckoutUrl (Afterpay hosted page)                            │
│                                                                             │
│  3. Customer Returns                                                        │
│     ← orderToken in URL query parameter                                     │
│                                                                             │
│  4. Authorize Payment                                                       │
│     LOCAL:    POST /api/afterpay/auth                                       │
│     AFTERPAY: POST /v2/payments/auth                                        │
│     DOCS:     https://developers.cash.app/.../payments/auth                 │
│                                                                             │
│  5. Capture Payment (if immediate mode)                                     │
│     LOCAL:    POST /api/afterpay/capture                                    │
│     AFTERPAY: POST /v2/payments/{orderId}/capture                           │
│     DOCS:     https://developers.cash.app/.../payments/capture-payment      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
```

### 4. Inline Verification Block

```markdown
<details>
<summary>✓ Verify This Feature</summary>

- [ ] OSM displays on product pages
- [ ] OSM displays on cart page
- [ ] OSM displays on checkout page
- [ ] Amount updates when cart changes
- [ ] Info modal opens on click

</details>
```

### 5. Local → Afterpay API Mapping Table

```markdown
## API Reference

### Local to Afterpay API Mapping

| Local Endpoint | Method | Afterpay API | Purpose | Docs |
|----------------|--------|--------------|---------|------|
| `/api/afterpay/checkout` | POST | `POST /v2/checkouts` | Create checkout session | [Link][checkout] |
| `/api/afterpay/auth` | POST | `POST /v2/payments/auth` | Authorize payment | [Link][auth] |
| `/api/afterpay/capture` | POST | `POST /v2/payments/{id}/capture` | Capture (partial) | [Link][capture] |
| `/api/afterpay/capture-full` | POST | `POST /v2/payments/capture` | Capture (full) | [Link][capture] |
| `/api/afterpay/refund` | POST | `POST /v2/payments/{id}/refund` | Process refund | [Link][refund] |
| `/api/afterpay/void` | POST | `POST /v2/payments/{id}/void` | Void authorization | [Link][void] |
| `/api/afterpay/payment/[id]` | GET | `GET /v2/payments/{id}` | Get payment details | [Link][get] |
| `/api/afterpay/configuration` | POST | `GET /v2/configuration` | Get merchant config | [Link][config] |
| `/api/webhooks/afterpay` | POST | - | Receive webhook events | [Link][webhook] |

**Sandbox Base URL:** `https://global-api-sandbox.afterpay.com`

[checkout]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1
[auth]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth
[capture]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment
[refund]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund
[void]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment
[get]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id
[config]: https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration
[webhook]: https://developers.cash.app/cash-app-afterpay/guides/api-development/webhook-signature-generation
```

---

## Navigation Design (for /docs page TOC)

### Sidebar Structure

The TOC sidebar should reflect the Part → Section hierarchy:

```
📋 AT A GLANCE

📦 GETTING STARTED
   └─ Quick Start

💳 PAYMENT FEATURES
   ├─ On-Site Messaging
   ├─ Express Checkout
   │  ├─ Integrated Shipping
   │  └─ Deferred Shipping
   ├─ Standard Checkout
   │  ├─ Redirect Flow
   │  └─ Popup Flow
   └─ Capture Modes

⚙️ PAYMENT OPERATIONS
   ├─ Admin Panel
   ├─ Webhooks
   └─ Order History

🔗 API REFERENCE
   ├─ API Mapping
   ├─ Flow Diagrams
   ├─ Test Credentials
   └─ Troubleshooting

🛠️ DEVELOPER TOOLS
   ├─ Developer Panel
   └─ Code Viewer

🎨 APP CUSTOMIZATION
   ├─ Settings
   ├─ Navigation
   ├─ Design System
   ├─ UI Components
   └─ In-App Docs
```

### Visual Hierarchy in TOC

- **Part headers**: Uppercase, slightly larger, with icon prefix
- **Section links**: Normal weight, indented
- **Subsection links**: Lighter weight, further indented
- **Active section**: Mint highlight bar on left edge
- **Hover state**: Subtle background tint

---

## Content Migration Checklist

### From Current Structure:

| Current Section | New Location | Changes |
|-----------------|--------------|---------|
| Quick Start | Part 1: Getting Started | Keep as-is |
| Design System | Part 6: App Customization | Move to end |
| Dark Mode | Part 6: Settings | Move to end |
| Navigation | Part 6: Navigation | Move to end |
| On-Site Messaging | Part 2: Payment Features | Add API URLs, inline verify |
| Express Checkout | Part 2: Payment Features | Add flow diagram, API URLs |
| Standard Checkout | Part 2: Payment Features | Add flow diagram, API URLs |
| Capture Modes | Part 2: Payment Features | Add API URLs |
| Payment Admin Panel | Part 3: Payment Operations | Keep, add inline verify |
| Order History | Part 3: Payment Operations | Keep, add inline verify |
| Developer Tools | Part 5: Developer Tools | Keep all content |
| In-App Documentation | Part 6: App Customization | Move to end |
| UI Components | Part 6: App Customization | Move to end |
| Testing Checklist | Distributed | Break into inline sections |
| Troubleshooting | Part 4: API Reference | Consolidate |
| Afterpay API Reference | Part 4: API Reference | Expand with mapping table |

### New Content to Create:

- [ ] At a Glance overview table
- [ ] Common Patterns callout box
- [ ] API flow diagrams (4 total)
- [ ] Local → Afterpay API mapping table
- [ ] Convert testing checklist to inline verify blocks

---

## Implementation Notes

1. **Preserve all existing content** - Only reorganize and enhance
2. **Add Afterpay URLs inline** - Every local endpoint should reference its Afterpay equivalent
3. **Flow diagrams use ASCII art** - Works in both GitHub and /docs page rendering
4. **Collapsible verify sections** - Use `<details>` tags for inline checklists
5. **Consistent heading levels** - h2 for sections, h3 for subsections, h4 sparingly

---

## Success Criteria

- [ ] Afterpay payment features appear in first 3 sections
- [ ] Every local API endpoint has Afterpay URL reference
- [ ] Merchants can understand capabilities from At a Glance table
- [ ] Developers can trace full API flow with diagrams
- [ ] Testing verification is inline with each feature
- [ ] Developer Tools section fully preserved
- [ ] UI/design content moved to end but not deleted
- [ ] Document renders correctly in /docs page
