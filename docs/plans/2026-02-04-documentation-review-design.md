# Documentation Review and Updates

**Date:** 2026-02-04
**Purpose:** Prepare documentation for release/handoff
**Audience:** Merchants/stakeholders, developers, and internal team

---

## Summary

Comprehensive audit of README.md and how-to-use.md identified 20 issues across accuracy, completeness, clarity, and consistency. This document outlines the findings and action plan.

---

## Issues by Priority

### High Priority (Fix Immediately)

#### 1. Custom API Credentials Section Outdated
- **File:** how-to-use.md (lines 502-578)
- **Issue:** Documents a "Custom API Credentials" feature that no longer exists in the admin panel
- **Action:** Remove entire section
- **Effort:** 5 min

#### 2. Order Interface Mismatch
- **File:** how-to-use.md (lines 699-710)
- **Issue:** Documented interface doesn't match `lib/orders.ts`
- **Missing:** `captureMode` field
- **Wrong:** `status` values (missing `pending`, `refunded`, `voided`)
- **Wrong:** Shows `subtotal` and `shipping` fields that don't exist
- **Wrong:** Uses `CartItem[]` instead of `OrderItem[]`
- **Action:** Update to match actual implementation
- **Effort:** 5 min

#### 3. Next.js Version Incorrect
- **File:** README.md (line 303)
- **Issue:** States "Next.js 16" - needs verification
- **Action:** Check package.json and correct
- **Effort:** 2 min

#### 4. In-App Docs Link Won't Work from GitHub
- **File:** README.md (line 293)
- **Issue:** Link `/docs` is a route, not a GitHub path
- **Action:** Change to full URL `https://afterpay-demo-v2.vercel.app/docs`
- **Effort:** 2 min

---

### Medium Priority (Add Missing Content)

#### 5. Webhook Handler Demo Undocumented
- **File:** how-to-use.md
- **Issue:** Admin panel has Webhook Demo feature not documented
- **Features to document:**
  - Test webhook events (PAYMENT_CAPTURED, PAYMENT_AUTH_APPROVED, REFUND_SUCCESS, PAYMENT_DECLINED)
  - Webhook endpoint information
  - Recent test events display
- **Action:** Add new section under Payment Admin Panel or as separate section
- **Effort:** 15 min

#### 6. Payment Schedule Widget Location Unclear
- **File:** how-to-use.md (lines 364-375)
- **Issue:** Widget code shown but unclear it's on `/checkout/shipping` page
- **Action:** Add clarification that this appears on shipping page during deferred flow
- **Effort:** 5 min

---

### Low Priority (Quick Fixes)

#### 7. Storage Key Name Wrong
- **File:** how-to-use.md (line 696)
- **Current:** `afterpay_orders`
- **Actual:** `afterpay-demo-orders`
- **Action:** Correct the value

#### 8. Dark Mode Icon Description Backwards
- **File:** how-to-use.md (line 150)
- **Issue:** Says "Click sun (dark mode) or moon (light mode)" - reversed
- **Action:** Fix to "sun icon switches to light mode, moon icon switches to dark mode"

#### 9. Missing layout.tsx in Project Structure
- **File:** README.md (lines 157-219)
- **Issue:** `app/layout.tsx` not listed
- **Action:** Add to project structure

#### 10. Inconsistent Code Block Languages
- **File:** how-to-use.md
- **Issue:** Uses jsx, javascript, typescript, tsx inconsistently
- **Action:** Standardize to `typescript`/`tsx`

#### 11. Mixed Branding
- **Files:** Both
- **Issue:** Uses both "Afterpay" and "Cash App Afterpay"
- **Action:** Standardize to "Afterpay" (matching majority of codebase)

---

### Defer

#### 12. POST→GET Configuration Endpoint
- **File:** README.md (line 234)
- **Issue:** Local POST endpoint calls Afterpay GET API - could confuse readers
- **Action:** Consider adding clarifying note (low impact)

#### 13. Minor Formatting Inconsistencies
- Various small formatting issues
- **Action:** Address opportunistically during other fixes

---

## Implementation Plan

### Phase 1: Critical Fixes (15 min)
1. Remove Custom API Credentials section from how-to-use.md
2. Update Order interface in how-to-use.md
3. Fix Next.js version in README.md
4. Fix in-app docs link in README.md

### Phase 2: Add Missing Content (20 min)
1. Add Webhook Handler Demo documentation
2. Clarify Payment Schedule Widget location

### Phase 3: Polish (10 min)
1. Fix storage key name
2. Fix dark mode icon description
3. Add layout.tsx to project structure
4. Standardize code block languages
5. Standardize branding

### Phase 3: Verify
1. Test all links
2. Review in /docs page
3. Commit and push

---

## Success Criteria

- [ ] All high priority issues resolved
- [ ] All medium priority issues resolved
- [ ] Low priority issues addressed
- [ ] Documentation renders correctly in app's /docs page
- [ ] All external links working
- [ ] Ready for external users and team handoff
