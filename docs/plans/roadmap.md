# Afterpay Demo V2 - Comprehensive Analysis & Enhancement Roadmap

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement tasks from this plan.

**Goal:** Document the complete state of the Afterpay Demo application and provide prioritized enhancement and security remediation tasks.

**Architecture:** Next.js 16 App Router with React 19, Tailwind CSS, server-side API proxies to Afterpay v2 API, client-side state management via React Context + localStorage.

**Tech Stack:** Next.js 16.1.6, React 19, TypeScript 5, Tailwind CSS 3.4.1, Afterpay.js SDK, Square Marketplace SDK

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Current Feature Set](#current-feature-set)
3. [Architecture Summary](#architecture-summary)
4. [Documentation Status](#documentation-status)
5. [Security Analysis](#security-analysis)
6. [Enhancement Backlog (Prioritized)](#enhancement-backlog-prioritized)
7. [Security Remediation Plan (Prioritized)](#security-remediation-plan-prioritized)

---

## Application Overview

### Purpose
A comprehensive merchant checkout integration demo showcasing Afterpay's payment solutions. Targets:
- Merchants evaluating Afterpay integration
- Developers learning integration patterns
- Stakeholders understanding payment flows

### Project Structure
```
afterpay-demo-v2/
├── app/                          # Next.js App Router
│   ├── api/afterpay/            # 8 API proxy endpoints
│   ├── admin/                   # Payment management panel
│   ├── cart/                    # Shopping cart
│   ├── checkout/                # Checkout hub + review + shipping
│   ├── confirmation/            # Order confirmation
│   ├── products/[id]/           # Product detail pages
│   └── page.tsx                 # Homepage (product grid)
├── components/                  # 13 React components
├── lib/                         # Utilities (afterpay, cart, flowLogs, products, types)
├── docs/                        # Documentation
└── public/                      # Static assets
```

### Development Status
- **17 commits** on main branch (all within last 2 weeks)
- **Stabilization phase** - recent commits are bug fixes
- **Heavy focus** on Developer Panel tooling
- **Well-documented** - README.md (274 lines) + how-to-use.md (943 lines)

---

## Current Feature Set

### Checkout Methods

| Method | Shipping | Capture | Flow |
|--------|----------|---------|------|
| Express (Afterpay.js) | Integrated | Deferred | Popup → Auth → Confirmation |
| Express (Afterpay.js) | Integrated | Immediate | Popup → Auth → Capture → Confirmation |
| Express (Afterpay.js) | Deferred | Deferred | Popup → Shipping Page → Auth → Confirmation |
| Express (Afterpay.js) | Deferred | Immediate | Popup → Shipping Page → Auth → Capture → Confirmation |
| Standard (API) | N/A | Deferred | Redirect/Popup → Review → Auth → Confirmation |
| Standard (API) | N/A | Immediate | Redirect/Popup → Review → Capture Full → Confirmation |

### Core Features
- **On-Site Messaging (OSM)** - Payment breakdown badges on PDP/Cart
- **Express Checkout** - Afterpay.js popup with integrated/deferred shipping
- **Standard Checkout** - API integration with redirect/popup modes
- **Payment Admin Panel** - Lookup, capture, refund, void operations
- **Capture Mode Toggle** - Deferred vs immediate capture
- **Order History** - Persistent order tracking with localStorage
- **Webhook Handler** - Demo webhook endpoint for payment notifications
- **Error Boundaries** - Graceful error handling throughout the app

### Developer Tools
- **Developer Panel** - Resizable, filterable API log viewer
- **Flow Logs** - Complete transaction timeline on confirmation
- **Code Viewer** - Implementation snippets
- **cURL Export** - Copy requests as cURL commands
- **HAR Export** - Download logs for browser DevTools

### UI Features
- **Dark Mode** - System preference + manual toggle (fully supported on all pages)
- **Checkout Progress** - Visual stepper timeline
- **Loading States** - Skeleton loaders, mint spinners
- **Micro-interactions** - Cart bounce, tab slide animations

### Security Features (Implemented)
- **Input Validation** - All API routes validate input with Zod schemas
- **Error Sanitization** - API errors are sanitized before returning to clients
- **Security Headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

### Testing
- **Jest Test Suite** - 55 unit tests with 99.63% coverage on lib utilities
- **Validation Tests** - Comprehensive tests for all Zod schemas
- **Error Handling Tests** - Tests for error sanitization patterns

---

## Architecture Summary

### API Endpoints

| Local Route | Afterpay API | Purpose |
|-------------|--------------|---------|
| POST `/api/afterpay/checkout` | POST `/v2/checkouts` | Create checkout session |
| POST `/api/afterpay/auth` | POST `/v2/payments/auth` | Authorize payment |
| POST `/api/afterpay/capture` | POST `/v2/payments/{id}/capture` | Capture partial |
| POST `/api/afterpay/capture-full` | POST `/v2/payments/capture` | Auth + Capture |
| POST `/api/afterpay/refund` | POST `/v2/payments/{id}/refund` | Refund payment |
| POST `/api/afterpay/void` | POST `/v2/payments/{id}/void` | Void authorization |
| GET `/api/afterpay/payment/[id]` | GET `/v2/payments/{id}` | Get payment details |
| POST `/api/afterpay/configuration` | GET `/v2/configuration` | Merchant config |

### State Management

| Storage | Key | Purpose |
|---------|-----|---------|
| localStorage | `afterpay-demo-cart` | Cart items |
| localStorage | `theme` | Dark/light mode |
| localStorage | `afterpay_capture_mode` | Deferred/immediate |
| localStorage | `devPanelHeight` | Panel resize state |
| sessionStorage | `afterpay-flow-logs` | API call logs |
| URL params | `method`, `shipping`, `orderId` | Checkout state |

### Components

| Component | Purpose |
|-----------|---------|
| `CartProvider` | Cart state context |
| `ThemeProvider` | Dark mode context |
| `CheckoutExpress` | Afterpay.js popup checkout |
| `CheckoutStandard` | API-based checkout form |
| `FlowLogsDevPanel` | Resizable API log viewer |
| `OSMPlacement` | On-Site Messaging widget |
| `CheckoutProgress` | Visual checkout stepper |

---

## Documentation Status

### Well Documented
- Feature overview and getting started
- API endpoints with Afterpay docs links
- Step-by-step testing flows
- Design system (colors, typography, animations)
- Troubleshooting common issues
- Environment variable configuration

### Documentation Gaps
| Gap | Impact |
|-----|--------|
| Architecture/data flow diagrams | Medium - hard to understand system |
| Component API documentation | Medium - hard to extend |
| TypeScript interfaces reference | Low - types exist but undocumented |
| Security best practices | High - no security guidance |
| Error handling patterns | Medium - inconsistent error handling |
| Testing guide | High - no test suite exists |
| Deployment checklist | Medium - only Vercel mentioned |
| Mobile responsiveness notes | Low - works but undocumented |

---

## Security Analysis

### Critical Issues

| Issue | Location | Risk |
|-------|----------|------|
| **Exposed secrets in .env.local** | `.env.local` | Secret key may be in version control |

### High Severity Issues

| Issue | Location | Risk | Status |
|-------|----------|------|--------|
| **No authentication on API routes** | All `app/api/afterpay/*` routes | Anyone can capture/refund payments | OPEN |
| ~~**Custom credentials via UI**~~ | ~~`app/admin/page.tsx:718-726`~~ | ~~Credential injection risk~~ | **RESOLVED** (S3) |
| **Sensitive data in browser console** | `app/confirmation/page.tsx`, `app/admin/page.tsx` | PII/token exposure | OPEN |

### Medium Severity Issues

| Issue | Location | Risk | Status |
|-------|----------|------|--------|
| **Missing CSRF protection** | All API routes | Cross-site request forgery | OPEN |
| **localStorage for sensitive data** | Multiple files | XSS can steal data | OPEN |
| ~~**Insufficient input validation**~~ | ~~API routes~~ | ~~Malformed data processing~~ | **RESOLVED** (S6) |
| ~~**Information disclosure in errors**~~ | ~~API route catch blocks~~ | ~~System details leaked~~ | **RESOLVED** (S7) |
| ~~**Missing security headers**~~ | ~~`next.config.ts`~~ | ~~Missing CSP, X-Frame-Options~~ | **RESOLVED** (S4) |
| **innerHTML manipulation** | `components/OSMPlacement.tsx:36` | XSS risk | OPEN |

### Low Severity Issues

| Issue | Location | Risk |
|-------|----------|------|
| **No rate limiting** | All API routes | Brute force possible |
| **No audit logging** | All API routes | No visibility into misuse |
| **External scripts without SRI** | `app/layout.tsx:34-43` | Script tampering risk |
| **Unencrypted env vars** | `.env.local` | Secrets at rest |

---

## Enhancement Backlog (Prioritized)

### Priority 1: Critical (Production Blockers)

#### E1: Add Unit Test Suite ✅ COMPLETED
**Status:** DONE - Commit `221070a` (2026-02-04)
**Value:** Enables confident refactoring and catches regressions
**Effort:** Large
**Result:** 55 unit tests with 99.63% coverage on lib utilities
**Files Created:**
- `__tests__/lib/errors.test.ts`
- `__tests__/lib/validation.test.ts`
- `__tests__/lib/products.test.ts`
- `jest.config.ts`, `jest.setup.ts`

#### E2: Add Integration Tests for Checkout Flows
**Status:** OPEN
**Value:** Ensures checkout flows work end-to-end
**Effort:** Large
**Files:**
- Create: `__tests__/integration/checkout-express.test.ts`
- Create: `__tests__/integration/checkout-standard.test.ts`
- Create: `__tests__/integration/admin-panel.test.ts`

#### E3: Add Error Boundary Components ✅ COMPLETED
**Status:** DONE - Commit `dea9ffe` (2026-02-04)
**Value:** Graceful error handling, better UX
**Effort:** Small
**Files Created:**
- `components/ErrorBoundary.tsx`
- `app/error.tsx` (global error boundary)
- `app/checkout/error.tsx` (checkout-specific)

### Priority 2: High (Significant Value)

#### E4: Add Webhook Handler Demo ✅ COMPLETED
**Status:** DONE - Commit `fbc71d4` (2026-02-04)
**Value:** Shows complete integration including async notifications
**Effort:** Medium
**Files Created:**
- `app/api/webhooks/afterpay/route.ts`
- `lib/webhooks.ts`
- Webhook demo section in Admin Panel

#### E5: Add Order History/Persistence ✅ COMPLETED
**Status:** DONE - Commit `ee12863` (2026-02-04)
**Value:** Demo feels more realistic with persistent orders
**Effort:** Medium
**Files Created:**
- `lib/orders.ts` (localStorage-based order storage)
- `app/orders/page.tsx`
- Orders link in Header

#### E6: Add Mobile-Optimized Views
**Value:** Better demo experience on mobile devices
**Effort:** Medium
**Files:**
- Modify: `components/FlowLogsDevPanel.tsx` (mobile drawer)
- Modify: `app/admin/page.tsx` (responsive layout)
- Modify: `app/checkout/page.tsx` (mobile tabs)

#### E7: Add Analytics/Event Tracking Demo
**Value:** Shows merchants how to track checkout funnel
**Effort:** Small
**Files:**
- Create: `lib/analytics.ts`
- Modify: `components/CheckoutExpress.tsx`
- Modify: `components/CheckoutStandard.tsx`
- Modify: `app/confirmation/page.tsx`

### Priority 3: Medium (Nice to Have)

#### E8: Add Multi-Currency Support
**Value:** Demonstrates international merchant capabilities
**Effort:** Medium
**Files:**
- Modify: `lib/products.ts` (add currency field)
- Create: `components/CurrencySelector.tsx`
- Modify: `app/layout.tsx` (currency context)
- Modify: All checkout components

#### E9: Add Promotional Messaging
**Value:** Shows marketing integration patterns
**Effort:** Small
**Files:**
- Create: `components/PromoBanner.tsx`
- Modify: `app/page.tsx`
- Modify: `app/cart/page.tsx`

#### E10: Add Print Receipt Functionality
**Value:** Complete order flow with receipt generation
**Effort:** Small
**Files:**
- Create: `components/PrintReceipt.tsx`
- Modify: `app/confirmation/page.tsx`

#### E11: Add Keyboard Shortcuts
**Value:** Power user experience for developers testing
**Effort:** Small
**Files:**
- Create: `hooks/useKeyboardShortcuts.ts`
- Modify: `components/FlowLogsDevPanel.tsx`
- Modify: `app/admin/page.tsx`

### Priority 4: Low (Future Consideration)

#### E12: Add i18n/Localization
**Value:** International demo capability
**Effort:** Large
**Files:**
- Create: `lib/i18n/` directory
- Create: `messages/en.json`, `messages/es.json`, etc.
- Modify: All UI components

#### E13: Add A/B Testing Demo
**Value:** Shows experimentation patterns
**Effort:** Medium

#### E14: Add Offline Support (PWA)
**Value:** Demo works without network
**Effort:** Medium

#### E15: Add Voice/Accessibility Enhancements
**Value:** Inclusive design demonstration
**Effort:** Medium

#### E16: Retry Logic & Idempotency Demo - PARTIAL
**Status:** PARTIAL - Idempotency implemented in v2.6.0, retry UI pending
**Value:** Demonstrates safe retry patterns using requestId idempotency
**Effort:** Medium (remaining: Small)

**Completed (v2.6.0):**
- ✅ `requestId` parameter added to all payment operations (auth, capture, refund, void)
- ✅ Request ID visible in Developer Panel event details
- ✅ Enables safe retries on timeout/network failures

**Remaining:**
- Create: `lib/retry.ts` (retry utility with exponential backoff)
- Create: `components/TimeoutSimulator.tsx` (toggle in Admin Panel)
- Modify: `app/admin/page.tsx` (add timeout simulation UI)

**Remaining Features:**
- Configurable retry attempts with exponential backoff
- Timeout simulation toggle in Admin Panel
- Visual demonstration of idempotent responses

---

## Security Remediation Plan (Prioritized)

### Priority 1: Critical (Do Immediately)

#### S1: Rotate Exposed Credentials
**Severity:** CRITICAL
**Effort:** 5 minutes
**Steps:**
1. Log into Afterpay Merchant Portal
2. Generate new API credentials
3. Update `.env.local` with new credentials
4. Verify `.env.local` is in `.gitignore`
5. Test checkout flow works

#### S2: Add Authentication Middleware
**Severity:** HIGH
**Effort:** Large
**Files:**
- Create: `middleware.ts` (Next.js middleware)
- Create: `lib/auth.ts` (session utilities)
- Modify: All `app/api/afterpay/*` routes

**Implementation:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For demo: simple API key or session check
  const apiKey = request.headers.get('x-api-key');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/api/afterpay/capture') ||
                       request.nextUrl.pathname.startsWith('/api/afterpay/refund') ||
                       request.nextUrl.pathname.startsWith('/api/afterpay/void');

  if (isAdminRoute && !apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/afterpay/:path*',
};
```

#### S3: Remove Custom Credentials from Admin UI ✅ COMPLETED
**Status:** DONE - Commit `7e7799f` (2026-02-04)
**Severity:** HIGH
**Effort:** Small
**Result:** Custom credential inputs removed from Admin Panel

### Priority 2: High (Do This Week)

#### S4: Add Security Headers ✅ COMPLETED
**Status:** DONE - Commit `8a2a64d` (2026-02-04)
**Severity:** MEDIUM
**Effort:** Small
**Result:** Security headers added to `next.config.ts`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

#### S5: Add CSRF Protection
**Severity:** MEDIUM
**Effort:** Medium
**Files:**
- Create: `lib/csrf.ts`
- Modify: All POST API routes
- Modify: All form components

#### S6: Add Input Validation with Zod ✅ COMPLETED
**Status:** DONE - Commit `a9fc767` (2026-02-04)
**Severity:** MEDIUM
**Effort:** Medium
**Result:** Zod validation added to all API routes
**Files Created:**
- `lib/validation.ts` (112 lines with comprehensive schemas)
- All API routes now validate input before processing

#### S7: Sanitize Error Messages ✅ COMPLETED
**Status:** DONE - Commit `0f14af4` (2026-02-04)
**Severity:** MEDIUM
**Effort:** Small
**Result:** Error sanitization implemented across all API routes
**Files Created:**
- `lib/errors.ts` with `sanitizeError()` function
- Maps known error patterns to safe user-facing messages
- Logs full error details server-side only

### Priority 3: Medium (Do This Month)

#### S8: Migrate Sensitive Data from localStorage
**Severity:** MEDIUM
**Effort:** Medium
**Files:**
- Modify: `components/CartProvider.tsx` (use httpOnly cookies)
- Modify: `app/checkout/shipping/page.tsx`
- Modify: `app/checkout/review/page.tsx`

#### S9: Add Rate Limiting
**Severity:** LOW
**Effort:** Small
**Files:**
- Create: `lib/rateLimit.ts`
- Modify: API routes

#### S10: Add Audit Logging
**Severity:** LOW
**Effort:** Medium
**Files:**
- Create: `lib/audit.ts`
- Modify: All API routes

#### S11: Add Subresource Integrity for External Scripts
**Severity:** LOW
**Effort:** Small
**Files:**
- Modify: `app/layout.tsx`

### Priority 4: Low (Backlog)

#### S12: Add Content Security Policy
**Severity:** LOW
**Effort:** Medium

#### S13: Implement Proper Session Management
**Severity:** LOW
**Effort:** Large

#### S14: Add Dependency Vulnerability Scanning
**Severity:** LOW
**Effort:** Small
**Files:**
- Create: `.github/workflows/security.yml`

---

## Implementation Order Recommendation

### Phase 1: Security Hardening ✅ COMPLETED (2026-02-04)
1. ~~S1: Rotate credentials~~ (manual task - verify .env.local in .gitignore)
2. ✅ S4: Add security headers - DONE
3. ✅ S3: Remove custom credentials UI - DONE
4. ✅ S7: Sanitize error messages - DONE
5. ✅ S6: Add input validation - DONE

### Phase 2: Core Security (PENDING)
1. S2: Add authentication middleware
2. S5: Add CSRF protection
3. S9: Add rate limiting

### Phase 3: Testing Foundation ✅ COMPLETED (2026-02-04)
1. ✅ E1: Add unit test suite - DONE (55 tests, 99.63% coverage)
2. ✅ E3: Add error boundaries - DONE

### Phase 4: Feature Enhancement ✅ COMPLETED (2026-02-04)
1. ✅ E4: Webhook handler demo - DONE
2. ✅ E5: Order history - DONE
3. E6: Mobile optimization - PENDING
4. E7: Analytics demo - PENDING

### Additional Fixes (2026-02-04)
- ✅ Developer Panel resize on all pages (commits `9c3ba49`, `633c246`)
- ✅ Dark mode support on all pages (commit `a95eade`)

### Phase 5: v2.6.0 Release (2026-02-05) ✅ COMPLETED
**Idempotency & Checkout UX**
- ✅ Idempotency support via `requestId` for all payment operations
- ✅ Dynamic shipping updates in Order Summary with highlight animation
- ✅ Free shipping option for orders over $100
- ✅ Order Summary sidebar widened (60/40 grid split)
- ✅ Scroll-to-top button on all pages (accessible, Afterpay mint hover)
- ✅ Improved checkout flow labels for clarity (e.g., "Express Checkout with Integrated Shipping (Deferred Capture)")
- ✅ Admin Panel transaction status moved above Actions section
- ✅ Developer Panel header redesign and resize handle fix
- ✅ Orders page demo notice moved to top
- ✅ Amount Breakdown calculation fix (excludes voids from refund total)
- ✅ Changelog parity across CHANGELOG.md and how-to-use.md
- ✅ Author information added (@zedzcodez)

---

## Verification Checklist

### Security Verification
- [ ] Credentials rotated and .env.local in .gitignore
- [x] Security headers present (check with securityheaders.com) ✅
- [ ] API routes return 401 for unauthorized requests
- [x] Error messages don't leak system details ✅
- [x] Input validation rejects malformed data ✅
- [ ] CSRF tokens required for POST requests
- [ ] Rate limiting blocks excessive requests

### Enhancement Verification
- [x] Unit tests pass with >80% coverage ✅ (99.63%)
- [ ] Integration tests cover all checkout flows
- [x] Error boundaries catch and display errors gracefully ✅
- [ ] Mobile views are usable on 320px width
- [x] Documentation is up to date ✅

---

*Document generated: 2026-02-04*
*Last updated: 2026-02-05*
*Status: Phase 1, 3, 4, 5 COMPLETED - Phase 2 (Core Security) PENDING*
*Current Version: 2.6.0*
