# App Redesign: Configurable Demo Platform

**Date:** 2026-02-17
**Branch:** `feature/cash-app-pay`
**Status:** Implemented (all 13 tasks complete)

## Overview

Redesign the Afterpay demo app from a developer showcase into a configurable demo platform. All functionality is controlled from a centralized Admin configuration page. Developer-specific sections (code snippets, flow logs, API metadata) can be toggled on/off so users can experience a clean shopping journey or a full developer walkthrough.

### Goals

1. Separate functionality from configuration — Admin controls what features are active
2. Introduce "Buy Now" (Express Checkout) as an inline action on Product, Cart, and Mini-cart
3. Simplify the checkout page to Standard + Cash App Pay only
4. Allow toggling developer-specific UI on/off for clean demo experiences

## Aesthetic Direction: Bold Brand-Forward

Unapologetically Afterpay. Mint as a dominant color, not just an accent. High contrast, bold geometric shapes, playful but confident. Developer mode uses a monospace terminal aesthetic that contrasts dramatically with the clean shopping mode.

### Color System

| Role | Clean Mode | Dev Mode Additions |
|------|-----------|-------------------|
| Primary BG | Mint gradient (`#B2FCE4` to `#D4FEF0`) | Same, with dark overlays |
| Cards/Surfaces | White with mint border accents | Dark charcoal (`#111827`) panels |
| Text | Pure black `#000000` | Same + mint monospace (`#B2FCE4`) in code blocks |
| Accent | Black buttons, mint hovers | Green terminal text (`#22C55E`) for logs |
| Subtle | Light mint tint `#F0FDF9` | -- |

### Typography

| Role | Font | Source |
|------|------|--------|
| Display | Clash Display | Fontshare CDN |
| Body | General Sans | Fontshare CDN |
| Code/Dev | JetBrains Mono | Google Fonts |

- Clash Display: bold, geometric, modern. Headings, hero text, product names. All caps for impact headers.
- General Sans: clean, contemporary. Descriptions, form labels, prices.
- JetBrains Mono: dev mode code blocks, flow logs, API output.

### Geometric Identity

- Diagonal mint stripes as section dividers
- 12px border-radius on cards
- Bold black borders (2-3px) for key interactive elements
- Subtle dot-grid pattern overlay on mint backgrounds for texture

## Configuration System

### Config Shape

```typescript
interface AppConfig {
  expressCheckout: {
    enabled: boolean;
    type: 'integrated' | 'deferred';
  };
  cashAppPay: {
    enabled: boolean;
  };
  standardCheckout: {
    method: 'popup' | 'redirect';
  };
  captureMode: 'deferred' | 'immediate';
  developerMode: boolean;
}
```

### Storage & Delivery

- **Persistence:** localStorage (key: `"afterpay-demo-config"`)
- **Delivery:** New `ConfigProvider` React Context wrapping the app (alongside CartProvider and ThemeProvider)
- **Access:** `useConfig()` hook in any component
- **Reactivity:** Toggling a setting in Admin instantly updates all mounted components via context — no page refresh needed
- **Replaces:** The current scattered `afterpay_capture_mode` localStorage key

## Navigation & Header

### Simplified Nav

```
[$] Afterpay       Shop    Admin    Orders    User Guide     cart-icon    theme-toggle
```

**Changes from current:**
- Removed "Checkout" link — checkout is accessed via "Buy Now" (Express) or branded Afterpay buttons (Standard) in-context
- Cart icon becomes a mini-cart dropdown on hover/click

### Mini-Cart Dropdown

Appears on cart icon hover/click. Shows:

- Cart items (image, name, price)
- Total
- "Buy Now" button (only when Express Checkout is enabled)
- "Continue with Afterpay" branded button (navigates to `/checkout`)
- "View Full Cart" link

### Header Style

- Solid black background, white text, mint logo
- Sticky positioning
- When Developer Mode is ON: a thin bar below the header reading "DEVELOPER MODE" in monospace (JetBrains Mono), with dot-grid texture background. Clicking it navigates to Admin Configuration.

## Branded Button Assets

### "Buy Now" Button (Express Checkout)

Custom-built button: `BUY NOW WITH [afterpay-logo]`

| Theme | Background | Text Color | Logo |
|-------|-----------|------------|------|
| Light mode | Mint `#B2FCE4` | Black | `https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-black-32.svg` |
| Dark mode | Black `#000000` | White | `https://static.afterpaycdn.com/en-US/integration/logo/lockup/new-mono-white-32.svg` |

- Text "BUY NOW WITH" in Clash Display bold, vertically centered with the logo
- 48px button height, logo at 24px height

### "Continue with Afterpay" Button (Cart + Mini-cart)

Official Afterpay branded SVG button. Navigates to `/checkout`.

| Theme | Asset |
|-------|-------|
| Light mode | `https://static.afterpaycdn.com/en-US/integration/button/continue-with-afterpay/color-on-black.svg` |
| Dark mode | `https://static.afterpay.com/en-US/integration/button/continue-with-afterpay/black-on-green.svg` |

- Full-width, rendered as `<img>` inside an unstyled `<button>`
- Height: 48px
- `aria-label` for accessibility

### "Pay with Afterpay" Button (Checkout Page)

Official Afterpay branded SVG button. Submits the checkout form.

| Theme | Asset |
|-------|-------|
| Light mode | `https://static.afterpaycdn.com/en-US/integration/button/pay-with-afterpay/color-on-black.svg` |
| Dark mode | `https://static.afterpay.com/en-US/integration/button/pay-with-afterpay/black-on-green.svg` |

- Same rendering approach as the Continue button
- Pattern: light mode always gets `color-on-black`, dark mode always gets `black-on-green`

## Page Designs

### Product Detail Page

**Clean Mode (dev OFF):**
- Product image (left), product info (right)
- Category label, product name (Clash Display), price, OSM widget ("or 4 x $8.75 with Afterpay")
- "Buy Now" button (mint, only when Express enabled) above "Add to Cart" button (black)
- "Why shop with Afterpay" section at bottom

**Dev Mode (dev ON) adds:**
- Dark charcoal panel below product info with "DEVELOPER" label
- OSM integration code with syntax highlighting and copy button
- Mint-tinted monospace text, dot-grid texture background

### Product Grid (Homepage)

Each product card gets two compact buttons at bottom:
- "Buy" (mint, compact) — Express Checkout for single item. Only when Express enabled.
- "Add" (outlined black, compact) — adds to cart

### Cart Page

Two-column layout: cart items (left), Order Summary sidebar (right, sticky).

**Order Summary sidebar contains:**
- Subtotal, shipping, total
- OSM widget
- "Buy Now" button (when Express enabled)
- "Continue with Afterpay" branded button (always, navigates to `/checkout`)
- "Continue Shopping" link

### Checkout Page (`/checkout`)

**No Express Checkout tab.** Express lives exclusively in Buy Now buttons elsewhere.

- Tabs only appear when Cash App Pay is enabled. If only Standard is on, no tabs — just the form.
- Standard tab: contact info form, shipping address, shipping method selection, "Pay with Afterpay" branded button
- Cash App tab: contact/address form + Cash App Pay SDK button/QR
- Order Summary sidebar (right, sticky)
- Progress stepper removed — the checkout is simpler now

**Dev mode ON** adds dark code panels below the form with flow code snippets and developer panel toggle.

### Confirmation Page

- Order confirmation summary (customer-facing)
- Dev mode ON adds: API request/response metadata blocks, flow summary technical details, full Developer Panel

## Admin Page

### Tab Structure

Two tabs: **Configuration** (new) and **Payment Operations** (existing).

### Configuration Tab

Four grouped sections:

**CHECKOUT METHODS**

1. **Express Checkout** — toggle ON/OFF + shipping type radio (Integrated / Deferred)
   - Description: "Launches via Buy Now buttons on Product, Cart, and Mini-cart. Customers complete payment in a popup."
   - Shipping type cards with radio selection and description text

2. **Standard Checkout** — always on (badge: "ALWAYS ON") + method radio (Popup / Redirect)
   - Description: "The full checkout form at /checkout. Customers enter contact and shipping details before payment."

3. **Cash App Pay** — toggle ON/OFF
   - Description: "Available as a tab on the /checkout page. Desktop shows QR code, mobile redirects to Cash App."

**PAYMENT SETTINGS**

4. **Capture Mode** — radio (Deferred / Immediate)
   - Deferred: "Auth only, capture from Admin panel"
   - Immediate: "Auth + capture in one step"

**DISPLAY**

5. **Developer Mode** — toggle ON/OFF
   - Description: "Show code snippets, API flow logs, integration examples, and the Developer Panel across all pages. Turn off for a clean shopping experience."

**MERCHANT INFO**

6. **Merchant Configuration** — fetch from API button, shows min/max order amounts

### Design Details

- Toggle buttons: pill-shaped, mint fill when active, outlined when inactive
- Radio option cards: bordered with description text, selected card gets mint left border accent
- Section headers: Clash Display all-caps with horizontal rule
- Changes save to localStorage immediately (no save button). Subtle mint flash animation confirms change.

### Payment Operations Tab

Existing functionality restyled to match Bold Brand-Forward aesthetic:
- Payment lookup by Order ID
- Capture, Refund, Void modal actions
- Flow logs display
- No structural changes

## Developer Mode Toggle Behavior

### What Hides When Dev Mode is OFF

| Page | Elements Hidden |
|------|----------------|
| Product Detail | OSM Integration Code section, "View OSM Integration Code" expandable |
| Checkout | Flow code snippets, "Show Developer Panel" button, code viewer expandables |
| Confirmation | API request/response metadata blocks, flow summary technical details |
| All pages | Bottom Developer Panel (flow logs drawer) removed from DOM |
| Header | "DEVELOPER MODE" indicator bar disappears |

### What Stays Visible Regardless

| Element | Reason |
|---------|--------|
| OSM widget ("or 4 x $8.75") | Consumer-facing feature |
| Checkout form fields | Core shopping functionality |
| Order confirmation summary | Customer-facing receipt |
| Admin page (both tabs) | Admin is inherently behind-the-scenes |
| Order history page | Customer-facing order tracking |

### Toggle Transition Animation

**Hiding (dev ON to OFF):** Dev sections slide up and fade out simultaneously (300ms ease-out). Surrounding content smoothly reflows.

**Showing (dev OFF to ON):** Dev sections fade in and slide down (400ms ease-out with stagger). Dark panels appear one-by-one, top to bottom, 100ms stagger delay — "terminal booting up" effect.

**Bottom drawer:** Slides down off-screen when hiding, slides up when showing.

### Config Reactivity

1. User toggles setting in Admin
2. `ConfigProvider` updates context state + persists to localStorage
3. Every component consuming `useConfig()` re-renders
4. Affected elements animate in/out on all mounted pages
5. Subsequent page navigations render correctly from first paint (no flash)

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| Aesthetic | Bold Brand-Forward — mint dominant, geometric, Clash Display + General Sans |
| Admin | Tabbed: Configuration + Payment Operations |
| Express Checkout | "Buy Now" on Product, Cart, Mini-cart (inline popup) |
| Standard Checkout | `/checkout` page with form, official branded "Pay" button |
| Cash App Pay | Tab on `/checkout` alongside Standard (when enabled) |
| Buy Now button | Custom mint button: `BUY NOW WITH [afterpay logo]` |
| Cart/Mini-cart button | Official `continue-with-afterpay` SVG buttons |
| Checkout button | Official `pay-with-afterpay` SVG buttons |
| Button theme pattern | Light = `color-on-black`, Dark = `black-on-green` |
| Dev mode OFF | Hides code, logs, dev panel. Clean shopping experience |
| Dev mode ON | Dark terminal panels, monospace text, header indicator bar |
| Config storage | ConfigProvider Context + localStorage, instant reactivity |
| Nav items | Shop, Admin, Orders, User Guide, Cart, Theme toggle |
| Removed from nav | Checkout link (accessed via in-context buttons) |
