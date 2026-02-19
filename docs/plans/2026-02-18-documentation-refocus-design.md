# Documentation Refocus & Cash App Pay Badge - Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refocus user-facing documentation on Afterpay functionality (remove app internals), add FAQ section, restructure summary features, and add Cash App Pay hero badge.

**Status:** Design approved, pending implementation
**Branch:** `feature/cash-app-pay`

---

## Scope

### Files to Modify
- `how-to-use.md` — Major trim + FAQ addition + OSM rename
- `summary.md` — Core Features restructure + OSM rename
- `app/page.tsx` — Cash App Pay badge on hero banner

### Files to Create
- `docs/archive/how-to-use-v3.0.md` — Archive of current how-to-use.md
- `docs/archive/summary-v3.0.md` — Archive of current summary.md

---

## Design Decisions

### Audience
Both merchants evaluating Afterpay AND integration developers. Remove anything about this app's internal architecture, design system, or React implementation. Keep Afterpay API/SDK code.

### Naming
Replace all "OSM" abbreviations with "On-Site Messaging" throughout both documents.

---

## 1. how-to-use.md Changes

### 1a. Remove Part 6: App Customization (~520 lines)

**Remove entirely:**
- Navigation section (~100 lines) — flat nav, mini-cart dropdown, mobile nav, technical details
- Design System section (~80 lines) — typography, color palette, product images, button styles, form styles, animations
- UI Components section (~160 lines) — checkout progress, buy now button internals, loading states, micro-interactions, form styling, admin visualization
- In-App Documentation section (~80 lines) — meta docs about the docs page

**Keep but trim:**
- Dark Mode — reduce to 3-line brief mention: toggle via sun/moon icon, system detection, persisted

### 1b. Trim "Technical Details" in Kept Sections

Within Parts 1-5, remove internal app code from "Technical Details" subsections:

**Remove:**
- Component file paths (e.g., `components/OSMPlacement.tsx`, `components/CheckoutCashApp.tsx`)
- File-to-purpose tables (e.g., Admin Panel files table)
- Internal React implementation code (state management, useEffect patterns, DOM timing workarounds)
- CSS class references and Tailwind config
- Dark mode implementation code

**Keep:**
- Afterpay API/SDK code (e.g., `window.Afterpay.renderCashAppPayButton(...)`)
- Afterpay.js initialization patterns (OSM `<square-placement>` HTML)
- Environment variable references for Afterpay config
- Afterpay documentation links
- Verification checklists (`<details>` blocks)
- Testing steps and flow descriptions

### 1c. Add FAQ Section (replaces Troubleshooting)

Replace the current "Troubleshooting" section (7 items, lines 1156-1192) with a comprehensive FAQ.

**Structure:**

#### General Questions
- What's the difference between Express and Standard Checkout?
- When should I use deferred vs immediate capture?
- Can I test with real money in the sandbox?
- What test cards are available?
- How does the token flow work?
- What is On-Site Messaging and where does it appear?
- Can I use Cash App Pay with Express Checkout?

#### Technical Gotchas (migrated from Troubleshooting)
- Popup flow shows "Cancelled" — popupOriginUrl mismatch
- On-Site Messaging not displaying — invalid placement IDs
- Widget not loading (deferred shipping) — Afterpay.js not loaded
- Capture fails "Already Captured" — payment already captured
- Refund exceeds available amount — check available balance
- Cash App Pay button not rendering — DOM container must exist before SDK init
- Cash App Pay button wrong size/style — shadow DOM styling

### 1d. Rename OSM → On-Site Messaging

Replace all instances of "OSM" (standalone abbreviation) with "On-Site Messaging" throughout the document. Keep the abbreviated form only in parenthetical definitions like "On-Site Messaging (OSM)".

### 1e. Updated Table of Contents

```
Part 1: Getting Started
  1. Quick Start

Part 2: Afterpay Payment Features
  2. On-Site Messaging
  3. Express Checkout
  4. Standard Checkout
  5. Cash App Pay
  6. Capture Modes

Part 3: Payment Operations
  7. Payment Admin Panel
  8. Webhook Handler
  9. Order History

Part 4: API Reference
  10. Local to Afterpay API Mapping
  11. Idempotency with requestId
  12. API Flow Diagrams
  13. Test Credentials
  14. FAQ

Part 5: Developer Tools
  15. Developer Panel
  16. Integration Flow Summary
  17. Code Viewer

Part 6: Reference
  18. Settings (Dark Mode)
  19. Afterpay Resources
  20. Changelog
```

---

## 2. summary.md Changes

### 2a. Restructure Core Features

Replace the current flat 10-row table with grouped sections by user journey:

```markdown
## Core Features

### Shopping Experience
| Feature | Description |
|---------|-------------|
| On-Site Messaging | "Pay in 4" and "Pay Monthly" badges on product and cart pages |
| Buy Now | Express Checkout popup from product pages, cart, and mini-cart |

### Checkout
| Feature | Description |
|---------|-------------|
| Standard Checkout | Redirect or popup flow to Afterpay |
| Cash App Pay | QR code on desktop, Cash App redirect on mobile |

### Payment Operations
| Feature | Description |
|---------|-------------|
| Capture Modes | Deferred (authorize then capture) or Immediate |
| Refunds & Voids | Full/partial refunds and void authorization |
| Order History | Track completed orders with status |

### Admin & Developer
| Feature | Description |
|---------|-------------|
| Admin Panel | Configuration + Payment Operations tabs |
| Developer Mode | Toggle to show/hide API logs, code, dev tools |
```

### 2b. Rename OSM → On-Site Messaging

Same treatment as how-to-use.md.

---

## 3. Cash App Pay Hero Badge

### Location
`app/page.tsx` — hero section, between the description paragraph and the CTA buttons.

### Design
A "Now with Cash App Pay" badge featuring the official Cash App Pay logo with a subtle pulsing/glowing animation to draw attention.

### Logo Assets
From Afterpay CDN (`static.afterpaycdn.com`):
- Light mode: `cashapppay-color-black-32.svg` (color logo, black text)
- Dark mode: `cashapppay-color-white-32.svg` (color logo, white text)

### Animation
CSS pulse/glow animation — subtle enough to be tasteful, attention-grabbing enough to highlight the new feature. Uses the mint color for the glow effect.

### Config-Gated
The badge should only display when Cash App Pay is enabled in Admin Configuration (`config.cashAppPay.enabled`). This requires wrapping the hero in a client component or extracting the badge into its own client component.

---

## Pre-work

Before any edits, archive current state:
- Copy `how-to-use.md` → `docs/archive/how-to-use-v3.0.md`
- Copy `summary.md` → `docs/archive/summary-v3.0.md`

---

*Created: 2026-02-18*
