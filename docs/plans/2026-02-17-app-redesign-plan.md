# App Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Afterpay demo app into a configurable demo platform with centralized Admin config, inline Express Checkout via Buy Now buttons, developer mode toggle, and Bold Brand-Forward aesthetic.

**Architecture:** New `ConfigProvider` React Context delivers app-wide configuration persisted in localStorage. Components consume config via `useConfig()` hook to conditionally render features (Express Checkout, Cash App Pay, Developer Mode). Express Checkout is decoupled from the checkout page and launched inline via reusable `BuyNowButton` components. The Admin page gains a Configuration tab for all feature toggles.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS, Fontshare CDN (Clash Display + General Sans), Google Fonts (JetBrains Mono)

**Design Doc:** `docs/plans/2026-02-17-app-redesign-design.md`

---

## Phase 1: Configuration Foundation

### Task 1: Create AppConfig types and ConfigProvider

**Files:**
- Create: `lib/config.ts`
- Create: `components/ConfigProvider.tsx`
- Modify: `lib/types.ts` (add AppConfig export)

**Step 1: Create config utilities**

Create `lib/config.ts` with:

```typescript
export interface AppConfig {
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

const STORAGE_KEY = 'afterpay-demo-config';

export const DEFAULT_CONFIG: AppConfig = {
  expressCheckout: { enabled: true, type: 'integrated' },
  cashAppPay: { enabled: true },
  standardCheckout: { method: 'popup' },
  captureMode: 'deferred',
  developerMode: true,
};

export function getStoredConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
```

**Step 2: Create ConfigProvider**

Create `components/ConfigProvider.tsx` following the same pattern as `CartProvider.tsx`:

```typescript
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppConfig, DEFAULT_CONFIG, getStoredConfig, saveConfig } from "@/lib/config";

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(getStoredConfig());
    // Migrate legacy capture mode setting
    const legacyMode = localStorage.getItem('afterpay_capture_mode');
    if (legacyMode === 'deferred' || legacyMode === 'immediate') {
      const stored = getStoredConfig();
      if (stored.captureMode !== legacyMode) {
        const updated = { ...stored, captureMode: legacyMode as 'deferred' | 'immediate' };
        saveConfig(updated);
        setConfig(updated);
      }
      localStorage.removeItem('afterpay_capture_mode');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveConfig(config);
  }, [config, mounted]);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig(prev => {
      const next = { ...prev };
      // Deep merge for nested objects
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          (next as Record<string, unknown>)[key] = { ...(prev as Record<string, unknown>)[key] as object, ...value };
        } else {
          (next as Record<string, unknown>)[key] = value;
        }
      }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useConfig must be used within a ConfigProvider");
  return context;
}
```

**Step 3: Wire ConfigProvider into layout**

Modify `app/layout.tsx`:
- Import ConfigProvider
- Wrap inside ThemeProvider, outside CartProvider:
```tsx
<ThemeProvider>
  <ConfigProvider>
    <CartProvider>
      <Header />
      <main>{children}</main>
      <ScrollToTop />
    </CartProvider>
  </ConfigProvider>
</ThemeProvider>
```

**Step 4: Run dev server and verify no regressions**

Run: `npm run dev`
Expected: App loads without errors, existing functionality unchanged.

**Step 5: Commit**

```bash
git add lib/config.ts components/ConfigProvider.tsx app/layout.tsx
git commit -m "feat: add ConfigProvider with AppConfig types and localStorage persistence"
```

---

## Phase 2: Typography & Styling Foundation

### Task 2: Add new fonts and update Tailwind config

**Files:**
- Modify: `app/layout.tsx` (add Fontshare CDN links + JetBrains Mono)
- Modify: `tailwind.config.ts` (add font families + new colors)
- Modify: `app/globals.css` (add font-face declarations, new utilities)

**Step 1: Add font CDN links to layout.tsx**

In `app/layout.tsx`, add to `<head>`:
```tsx
{/* Fontshare CDN - Clash Display + General Sans */}
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet" />
```

Replace the Outfit and Plus Jakarta Sans Google Font imports with JetBrains Mono:
```tsx
import { JetBrains_Mono } from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});
```

Update the `<html>` className to include the new font variable:
```tsx
<html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
```

Remove the `outfit` and `plusJakarta` font imports and their variables from the html tag.

**Step 2: Update Tailwind config**

In `tailwind.config.ts`, update fontFamily:
```typescript
fontFamily: {
  display: ["'Clash Display'", "system-ui", "sans-serif"],
  body: ["'General Sans'", "system-ui", "sans-serif"],
  code: ["var(--font-code)", "'JetBrains Mono'", "monospace"],
},
```

Add new colors for dev mode:
```typescript
colors: {
  afterpay: {
    // ... existing colors ...
  },
  terminal: {
    bg: '#111827',
    text: '#B2FCE4',
    green: '#22C55E',
    border: '#1F2937',
  },
},
```

**Step 3: Update globals.css**

Add font-face fallback and update body font:
```css
body {
  font-family: 'General Sans', var(--font-body), system-ui, sans-serif;
}
```

Add new component classes for dev panels:
```css
@layer components {
  .dev-panel {
    @apply bg-terminal-bg border border-terminal-border rounded-xl p-4;
    background-image: radial-gradient(circle, rgba(178, 252, 228, 0.05) 1px, transparent 1px);
    background-size: 16px 16px;
  }

  .dev-label {
    @apply text-xs font-code font-medium text-terminal-text uppercase tracking-widest;
  }

  .dev-code {
    @apply font-code text-sm text-terminal-text;
  }
}
```

Add animation utilities for dev mode toggle:
```css
@keyframes dev-slide-down {
  from { opacity: 0; transform: translateY(-8px); max-height: 0; }
  to { opacity: 1; transform: translateY(0); max-height: 1000px; }
}

@keyframes dev-slide-up {
  from { opacity: 1; transform: translateY(0); max-height: 1000px; }
  to { opacity: 0; transform: translateY(-8px); max-height: 0; }
}

.animate-dev-enter {
  animation: dev-slide-down 0.4s ease-out forwards;
}

.animate-dev-exit {
  animation: dev-slide-up 0.3s ease-out forwards;
}
```

**Step 4: Verify fonts load correctly**

Run dev server, open browser, inspect elements to confirm Clash Display, General Sans, and JetBrains Mono are applied.

**Step 5: Commit**

```bash
git add app/layout.tsx tailwind.config.ts app/globals.css
git commit -m "feat: add Bold Brand-Forward typography with Clash Display, General Sans, JetBrains Mono"
```

---

## Phase 3: Branded Button Components

### Task 3: Create reusable branded button components

**Files:**
- Create: `components/BuyNowButton.tsx`
- Create: `components/AfterpayButton.tsx`

**Step 1: Create BuyNowButton**

Create `components/BuyNowButton.tsx`:

Custom-built mint button displaying "BUY NOW WITH [afterpay-logo]".
- Props: `onClick`, `disabled`, `className`, `size` ('default' | 'compact')
- Uses `useTheme()` to swap logo between light/dark mono SVGs
- Uses `useConfig()` — renders nothing if `expressCheckout.enabled` is false
- Light: mint bg `#B2FCE4`, black text, black mono logo
- Dark: black bg, white text, white mono logo
- Logo URLs from design doc
- Height 48px default, 40px compact
- Font: Clash Display bold, all caps

**Step 2: Create AfterpayButton**

Create `components/AfterpayButton.tsx`:

Renders official Afterpay SVG branded buttons.
- Props: `variant` ('continue' | 'pay'), `onClick`, `disabled`, `className`
- Uses `useTheme()` to swap between light/dark SVGs
- Light mode: `color-on-black.svg` variant
- Dark mode: `black-on-green.svg` variant
- URL patterns from design doc:
  - continue: `continue-with-afterpay/{variant}.svg`
  - pay: `pay-with-afterpay/{variant}.svg`
- Full-width `<img>` inside unstyled `<button>`
- Height: 48px
- Appropriate `aria-label` per variant

**Step 3: Verify both buttons render correctly**

Temporarily add both buttons to the homepage to visually verify in both light and dark mode. Remove after verification.

**Step 4: Commit**

```bash
git add components/BuyNowButton.tsx components/AfterpayButton.tsx
git commit -m "feat: add BuyNowButton and AfterpayButton branded components"
```

---

## Phase 4: Admin Page Redesign

### Task 4: Restructure Admin page with Configuration and Payment Operations tabs

**Files:**
- Modify: `app/admin/page.tsx` (major rewrite)

**Step 1: Add tab state and Configuration tab UI**

Rewrite `AdminContent` component:
- Add `activeTab` state: `'configuration' | 'operations'`
- Tab bar at top with Clash Display font, mint underline on active tab
- Configuration tab renders 4 sections using `useConfig()`:

**CHECKOUT METHODS:**
1. Express Checkout card — `[ON/OFF]` toggle + shipping type radio (Integrated/Deferred). Disabled radios when OFF.
2. Standard Checkout card — "ALWAYS ON" badge + method radio (Popup/Redirect)
3. Cash App Pay card — `[ON/OFF]` toggle

**PAYMENT SETTINGS:**
4. Capture Mode — radio cards (Deferred/Immediate)

**DISPLAY:**
5. Developer Mode — `[ON/OFF]` toggle with description

**MERCHANT INFO:**
6. Merchant Configuration — existing fetch + display (move from current admin page)

Toggle components should be pill-shaped buttons: mint fill when active, outlined when inactive. Radio option cards get a mint left border when selected.

All changes call `updateConfig()` from `useConfig()` — instant persistence.

**Step 2: Move Payment Operations to second tab**

Extract existing admin content (lookup, payment details, actions, event history) into the "Payment Operations" tab. Keep all existing functionality and state management. Remove the old Capture Mode toggle section (now in Configuration tab). Keep `FlowLogsDevPanel` — it should still render on the admin page (admin is always full-featured regardless of developer mode).

**Step 3: Remove legacy capture mode localStorage usage**

The admin page currently reads/writes `afterpay_capture_mode` directly. Replace all references with `useConfig().config.captureMode` and `updateConfig({ captureMode: ... })`. The ConfigProvider already handles the migration in Task 1.

**Step 4: Verify admin page**

- Configuration tab: all toggles work, persist on refresh
- Payment Operations tab: lookup, capture, refund, void all work
- Tab switching preserves state within each tab

**Step 5: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: redesign Admin page with Configuration and Payment Operations tabs"
```

---

## Phase 5: Header & Navigation Redesign

### Task 5: Update Header with simplified nav and mini-cart dropdown

**Files:**
- Modify: `components/Header.tsx` (major rewrite)

**Step 1: Update navigation links**

Remove "Checkout" from `demoNav`. Final nav structure:
```typescript
const navItems = [
  { href: "/", label: "Shop" },
  { href: "/admin", label: "Admin" },
  { href: "/orders", label: "Orders" },
  { href: "/docs", label: "User Guide" },
];
```

No divider groups — flat list.

**Step 2: Add mini-cart dropdown**

Replace the Cart text link with a cart icon button that opens a dropdown on click:
- Show cart items (small thumbnails, name, price)
- Show total
- `BuyNowButton` (only renders when Express enabled — component handles this internally)
- `AfterpayButton variant="continue"` (navigates to `/checkout`)
- "View Full Cart" link to `/cart`
- Close on click outside, on Escape, on route change

**Step 3: Add Developer Mode indicator bar**

Below the header, conditionally render a thin bar when `config.developerMode` is true:
- Background: terminal-bg with dot-grid texture (`dev-panel` CSS but thinner)
- Text: `"◆ DEVELOPER MODE"` in `font-code`, small, `text-terminal-text`
- Clickable — navigates to `/admin`
- Smooth slide-down animation on appear, slide-up on disappear

**Step 4: Update mobile menu**

Update mobile menu to match new nav structure. Include mini-cart content in mobile menu's Shopping section.

**Step 5: Verify**

- Desktop: nav links correct, mini-cart dropdown works, dev mode bar shows/hides
- Mobile: hamburger menu works, cart items visible
- Toggle dev mode from admin, verify bar appears/disappears without refresh

**Step 6: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: redesign Header with mini-cart dropdown and developer mode indicator"
```

---

## Phase 6: Product Pages — Buy Now Integration

### Task 6: Add Buy Now to product detail page

**Files:**
- Modify: `app/products/[id]/page.tsx`

**Step 1: Add Buy Now button**

Import and add `BuyNowButton` above the existing "Add to Cart" button. The `BuyNowButton` component already handles config visibility internally.

Update `handleBuyNow`:
- Instead of navigating to `/checkout?method=express`, launch Express Checkout popup inline
- Need to create a checkout session and initialize the Afterpay popup SDK directly
- Import the Express Checkout initialization logic from `CheckoutExpress` (may need to extract into a shared hook)

**Step 2: Create `useBuyNowCheckout` hook**

Create `hooks/useBuyNowCheckout.ts` that encapsulates:
- Creating a checkout session via `POST /api/afterpay/checkout` for a single product (or cart items)
- Initializing `window.Afterpay.initializeForPopup()` with Express config
- Handling `onCommenceCheckout`, `onComplete` callbacks
- Navigating to `/confirmation` on success
- Reading `config.expressCheckout.type` for integrated vs deferred shipping
- Reading `config.captureMode` for deferred vs immediate capture

This hook extracts the core Express Checkout logic from `CheckoutExpress.tsx` into a reusable form.

**Step 3: Wire Buy Now on product detail**

```tsx
const { startBuyNow, isLoading } = useBuyNowCheckout();

<BuyNowButton
  onClick={() => startBuyNow({ items: [{ product, quantity: 1 }], total: product.price })}
  disabled={isLoading}
/>
```

**Step 4: Conditionally show dev sections**

Wrap the existing `OSMInfoSection` and any code viewer sections with:
```tsx
{config.developerMode && (
  <div className="dev-panel animate-dev-enter">
    <span className="dev-label">Developer</span>
    <OSMInfoSection ... />
  </div>
)}
```

**Step 5: Verify**

- Buy Now launches Express popup for single product
- Dev mode toggle hides/shows developer sections
- Add to Cart still works normally

**Step 6: Commit**

```bash
git add hooks/useBuyNowCheckout.ts app/products/[id]/page.tsx
git commit -m "feat: add inline Buy Now Express Checkout to product detail page"
```

---

### Task 7: Add Buy Now to product grid cards

**Files:**
- Modify: `components/ProductCard.tsx`
- Modify: `components/ProductGrid.tsx`

**Step 1: Update ProductCard**

Currently the entire card is a `<Link>`. Need to restructure:
- Card body (image + info) remains a link to product detail
- Bottom section has two buttons: compact `BuyNowButton` and "Add" outlined button
- Add `useCart()` for `addToCart` and `useBuyNowCheckout()` for Express flow
- Stop event propagation on button clicks to prevent link navigation

**Step 2: Verify**

- "Buy" (mint compact) launches Express popup for that single product
- "Add" (outlined) adds to cart with animation
- Clicking card body still navigates to product detail
- Buy Now buttons only appear when Express is enabled

**Step 3: Commit**

```bash
git add components/ProductCard.tsx components/ProductGrid.tsx
git commit -m "feat: add Buy Now and Add to Cart buttons on product grid cards"
```

---

## Phase 7: Cart Page Redesign

### Task 8: Update Cart page with branded buttons

**Files:**
- Modify: `app/cart/page.tsx`

**Step 1: Add branded buttons to Order Summary**

In the Order Summary sidebar, replace "Proceed to Checkout" with:
1. `BuyNowButton` — launches Express Checkout for entire cart (inline popup)
2. `AfterpayButton variant="continue"` — navigates to `/checkout`
3. "Continue Shopping" link

Wire BuyNowButton:
```tsx
const { startBuyNow, isLoading } = useBuyNowCheckout();

<BuyNowButton
  onClick={() => startBuyNow({ items, total })}
  disabled={isLoading}
/>
<AfterpayButton
  variant="continue"
  onClick={() => router.push('/checkout')}
/>
```

**Step 2: Verify**

- Buy Now in cart launches Express popup for full cart
- Continue with Afterpay navigates to /checkout
- Both buttons respect light/dark theme

**Step 3: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: add Buy Now and Continue with Afterpay branded buttons to Cart page"
```

---

## Phase 8: Checkout Page Simplification

### Task 9: Remove Express Checkout tab, simplify checkout page

**Files:**
- Modify: `app/checkout/page.tsx`

**Step 1: Remove Express Checkout tab**

- Remove "Express Checkout" from the method tabs
- Remove `CheckoutExpress` import and component rendering
- Remove the always-mounted `<div style={{ display: method === "express" ? ... }}>` wrapper for Express

**Step 2: Conditional tabs based on config**

- Import `useConfig()`
- If `config.cashAppPay.enabled` is false, don't render tabs at all — just show Standard Checkout form directly
- If enabled, show two tabs: "Standard Checkout" and "Cash App Pay"
- Default to "standard" method

**Step 3: Update Standard Checkout to read config**

Pass `config.standardCheckout.method` to `CheckoutStandard` so it uses popup or redirect per admin config instead of its own internal toggle. Remove the internal Popup/Redirect toggle from `CheckoutStandard` component (or make it read-only from config).

**Step 4: Replace submit button with branded Pay button**

In `CheckoutStandard`, replace the "Pay with Afterpay" text button with:
```tsx
<AfterpayButton variant="pay" onClick={handleSubmit} disabled={isLoading} />
```

**Step 5: Conditionally render dev sections**

Wrap code viewers, "Show Developer Panel" button, and flow code sections with `config.developerMode` checks.

**Step 6: Verify**

- Express Checkout tab is gone
- Cash App Pay tab only appears when enabled in Admin
- Standard Checkout uses popup/redirect per config
- Pay button uses official branded SVG
- Dev sections hide when developer mode is off

**Step 7: Commit**

```bash
git add app/checkout/page.tsx components/CheckoutStandard.tsx
git commit -m "feat: simplify checkout page to Standard + Cash App only, add branded Pay button"
```

---

## Phase 9: Developer Mode Toggle Across All Pages

### Task 10: Wire developer mode visibility across all pages

**Files:**
- Modify: `components/FlowLogsDevPanel.tsx` (conditional on dev mode)
- Modify: `app/confirmation/page.tsx` (hide API metadata when dev off)
- Modify: `components/CheckoutCashApp.tsx` (hide dev sections)
- Modify: `components/CashAppInfoSection.tsx` (conditional render)

**Step 1: FlowLogsDevPanel respects developer mode**

In `FlowLogsDevPanel.tsx`, import `useConfig()`. If `config.developerMode` is false, return `null` — don't render the panel at all. Exception: always render on `/admin` page (check `usePathname()`).

**Step 2: Confirmation page conditionally shows dev content**

In `app/confirmation/page.tsx`:
- Import `useConfig()`
- Wrap API metadata blocks, flow summary technical details, and flow log entries with `config.developerMode` check
- Keep order confirmation summary always visible

**Step 3: CheckoutCashApp and CashAppInfoSection**

In `CheckoutCashApp.tsx`, wrap dev sections (code viewers, developer panel toggle) with `config.developerMode` check.

`CashAppInfoSection` is entirely developer content — wrap its usage with config check at the call site.

**Step 4: Verify dev mode toggle end-to-end**

1. Set dev mode ON in Admin — all dev sections visible everywhere
2. Set dev mode OFF — clean shopping experience, no code blocks, no flow logs, no developer panel
3. Admin page always shows full content regardless
4. OSM widgets remain visible in both modes

**Step 5: Commit**

```bash
git add components/FlowLogsDevPanel.tsx app/confirmation/page.tsx components/CheckoutCashApp.tsx components/CashAppInfoSection.tsx
git commit -m "feat: wire developer mode toggle across all pages"
```

---

## Phase 10: Checkout Components Config Integration

### Task 11: Wire remaining checkout components to config

**Files:**
- Modify: `components/CheckoutExpress.tsx` (read config for shipping type)
- Modify: `components/CheckoutStandard.tsx` (read config for method)
- Modify: `components/CheckoutCashApp.tsx` (read config for capture mode)

**Step 1: CheckoutExpress reads config**

Replace the internal `shippingFlow` state with config value. The Express component is now only used via `useBuyNowCheckout` hook — it should read `config.expressCheckout.type` for integrated vs deferred.

**Step 2: CheckoutStandard reads config**

Replace the internal Popup/Redirect toggle with config-driven value. Remove the toggle UI. Read `config.standardCheckout.method` and `config.captureMode`.

**Step 3: All checkout components read captureMode from config**

Replace all `localStorage.getItem('afterpay_capture_mode')` reads with `config.captureMode` from `useConfig()`.

**Step 4: Verify all checkout flows work**

- Express via Buy Now (integrated and deferred shipping per config)
- Standard via checkout page (popup and redirect per config)
- Cash App via checkout page
- Deferred vs immediate capture per config

**Step 5: Commit**

```bash
git add components/CheckoutExpress.tsx components/CheckoutStandard.tsx components/CheckoutCashApp.tsx
git commit -m "feat: wire all checkout components to centralized config"
```

---

## Phase 11: Visual Polish

### Task 12: Apply Bold Brand-Forward styling across all pages

**Files:**
- Modify: `app/page.tsx` (homepage hero + product grid)
- Modify: `app/cart/page.tsx` (styling)
- Modify: `app/checkout/page.tsx` (styling)
- Modify: `app/admin/page.tsx` (styling)
- Modify: `components/Header.tsx` (styling)
- Modify: `app/globals.css` (refinements)

**Step 1: Homepage hero**

Update hero section:
- Clash Display all-caps for headline: "SHOP NOW. PAY LATER."
- Mint gradient background made more prominent
- Geometric diagonal stripe pattern
- Bold black CTA buttons

**Step 2: Cards and surfaces**

Update card styles across all pages:
- 12px border-radius
- Bold borders on interactive elements
- Mint accents on hover states

**Step 3: Admin page polish**

Apply section headers: Clash Display all-caps with horizontal rule. Toggle pill styling. Radio card selected state with mint left border.

**Step 4: Dev mode panel styling**

Ensure all dev sections use `dev-panel` class with dot-grid texture, `dev-label` headers, and `dev-code` monospace text.

**Step 5: Verify visual consistency**

Browse through all pages in both light and dark mode. Verify:
- Typography is consistent (Clash Display for headers, General Sans for body, JetBrains Mono for code)
- Mint is used boldly as primary, not just accent
- Dev panels have terminal aesthetic with clear visual separation

**Step 6: Commit**

```bash
git add app/page.tsx app/cart/page.tsx app/checkout/page.tsx app/admin/page.tsx components/Header.tsx app/globals.css
git commit -m "feat: apply Bold Brand-Forward visual styling across all pages"
```

---

## Phase 12: Cleanup & Testing

### Task 13: Remove legacy code and verify all flows

**Files:**
- Modify: `components/CheckoutProgress.tsx` (may be unused if progress stepper removed)
- Modify: `app/checkout/page.tsx` (remove CheckoutProgress import if unused)
- Review: all files for dead imports and unused code

**Step 1: Remove progress stepper**

The checkout page no longer has 3 methods, so the progress stepper is less relevant. Remove `CheckoutProgress` usage from checkout page. Keep the component file in case it's used on confirmation page.

**Step 2: Remove legacy localStorage references**

Search for `afterpay_capture_mode` across the codebase. Remove any remaining direct reads/writes — all should go through `useConfig()` now.

**Step 3: Run full test suite**

Run: `npm test`
Fix any broken tests due to missing context providers (tests may need `ConfigProvider` wrapper).

**Step 4: Manual end-to-end verification**

Test each flow:
1. Express Checkout via Buy Now on product page (single item)
2. Express Checkout via Buy Now on product card (single item)
3. Express Checkout via Buy Now on cart page (full cart)
4. Express Checkout via Buy Now on mini-cart (full cart)
5. Standard Checkout via Pay with Afterpay (popup mode)
6. Standard Checkout via Pay with Afterpay (redirect mode)
7. Cash App Pay via checkout page
8. Admin: toggle each config, verify reactivity
9. Dev mode on/off: verify all sections show/hide correctly
10. Light/dark mode: verify all branded buttons swap correctly

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove legacy code, fix tests, verify all checkout flows"
```

---

## Task Dependency Graph

```
Task 1 (ConfigProvider) ──┬── Task 4 (Admin Redesign)
                          ├── Task 5 (Header Redesign)
                          ├── Task 6 (Product Buy Now)
                          ├── Task 8 (Cart Redesign)
                          └── Task 10 (Dev Mode Toggle)

Task 2 (Typography) ──────── Task 12 (Visual Polish)

Task 3 (Branded Buttons) ─┬── Task 5 (Header - mini-cart)
                           ├── Task 6 (Product Buy Now)
                           ├── Task 7 (Product Grid)
                           ├── Task 8 (Cart)
                           └── Task 9 (Checkout)

Task 6 (Product Buy Now) ─── Task 7 (Product Grid)
                               └── uses useBuyNowCheckout from Task 6

Task 9 (Checkout Simplify) ── Task 11 (Config Wire)

Task 10 (Dev Mode) ─────────── Task 12 (Visual Polish)

Task 12 (Visual Polish) ────── Task 13 (Cleanup)
```

**Critical path:** Task 1 → Task 3 → Task 6 → Task 9 → Task 11 → Task 12 → Task 13

**Parallelizable:** Tasks 2 + 3 can run in parallel with Task 1. Tasks 4 + 5 can run in parallel after Task 1.
