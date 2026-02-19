# Afterpay Demo App Summary

A configurable demo platform for Afterpay's Buy Now, Pay Later (BNPL) payment solutions. Toggle features on and off from the Admin panel to explore different checkout configurations, capture modes, and developer tools - all built with Next.js 16, React 19, and TypeScript.

**Live Demo:** [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)

---

## What This Demo Does

This application demonstrates how merchants integrate Afterpay into their e-commerce checkout experience. It provides a fully functional sandbox environment where you can:

- **Configure features** - Enable/disable Express Checkout, Cash App Pay, Developer Mode, and capture settings from the Admin panel
- **Test checkout flows** - Standard and Cash App Pay on the checkout page, Express Checkout inline via Buy Now buttons
- **Process payments** - Authorize, capture, refund, and void operations
- **View real-time API logs** - See exactly what's sent to and received from Afterpay
- **Explore OSM messaging** - Payment breakdown badges on product and cart pages

---

## Core Features

| Category | Features |
|----------|----------|
| **Admin Configuration** | Feature toggles for Express Checkout, Cash App Pay, Developer Mode, capture mode, and checkout method |
| **Checkout Flows** | Standard Checkout (redirect/popup modes) + Cash App Pay (QR code on desktop / mobile redirect) on the checkout page |
| **Buy Now** | Inline Express Checkout from product pages, cart, and mini-cart via branded Buy Now buttons |
| **Developer Mode** | Toggle to show/hide code snippets, flow logs, and dev panels for a clean shopping vs developer experience |
| **Payment Operations** | Deferred & Immediate capture, partial/full refunds, void authorization |
| **On-Site Messaging** | "Pay in 4" and "Pay Monthly" badges on PDP, cart, and checkout |
| **Admin Panel** | Configuration tab (feature toggles) + Payment Operations tab (lookup, capture, refund, void, event history) |
| **Developer Tools** | API request/response logging, cURL/HAR export, code snippets, flow summaries |
| **Order Management** | Persistent order history, individual deletion, status tracking |
| **Branded Buttons** | BuyNowButton (custom mint) and AfterpayButton (official "Pay with Afterpay" SVG) components |

---

## Who Benefits From This Demo

### Merchants Evaluating Afterpay

See the full customer experience before integrating - from product pages with payment badges through checkout completion. Toggle features on and off from the Admin Configuration tab to compare different checkout setups without writing any code.

**Key value:**
- Visual preview of OSM badge placements
- Toggle Express Checkout, Cash App Pay, and capture modes to see different configurations
- Understand deferred vs immediate capture implications

### Integration Developers

Learn API patterns with real request/response logging. Toggle Developer Mode on to see code snippets, flow logs, and the Developer Panel showing exactly what's sent to Afterpay APIs, with cURL export for debugging.

**Key value:**
- Token flow visualization (Checkout Token -> Order Token -> Order ID)
- Developer Mode toggle for clean shopping vs full developer experience
- Request/response body inspection
- Copy as cURL for testing
- HAR export for browser DevTools

### Technical Architects

Compare Express vs Standard checkout trade-offs. Evaluate deferred vs immediate capture for order management workflows. Review security patterns including input validation and error sanitization.

**Key value:**
- Architecture decision reference
- Capture mode comparison
- API endpoint mapping

### Product & Business Teams

Visualize checkout UX without writing code. Demo payment operations (refunds, voids) to understand merchant capabilities. See how OSM messaging appears on different pages.

**Key value:**
- No-code feature exploration
- Payment lifecycle demonstration
- Customer experience preview

### QA & Testing Teams

Sandbox environment with test card CVVs (000=approved, 051=declined). Complete end-to-end flow testing with detailed logging for debugging.

**Key value:**
- Test credential reference
- Full flow testing capability
- Error scenario simulation

### Afterpay Sales & Solutions Teams

Live demo for merchant presentations. Shows OSM placement options, checkout customization, and admin capabilities in a polished, professional interface.

**Key value:**
- Presentation-ready demo environment
- Feature showcase for prospects
- Technical capability demonstration

---

## Technical Highlights

### API Coverage

Wraps all Afterpay v2 endpoints:

| Local Endpoint | Afterpay API | Purpose |
|----------------|--------------|---------|
| POST /api/afterpay/checkout | POST /v2/checkouts | Create checkout session |
| POST /api/afterpay/auth | POST /v2/payments/auth | Authorize payment |
| POST /api/afterpay/capture | POST /v2/payments/{id}/capture | Deferred capture (full/partial) |
| POST /api/afterpay/capture-full | POST /v2/payments/capture | Auth + Capture |
| POST /api/afterpay/refund | POST /v2/payments/{id}/refund | Refund (full/partial) |
| POST /api/afterpay/void | POST /v2/payments/{id}/void | Void (full/partial) |

### Security

- **Input Validation** - All API routes validate input with Zod schemas
- **Error Sanitization** - API errors are sanitized before returning to clients
- **Security Headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### Quality

- **Test Coverage** - 57 unit tests with 99.63% coverage on lib utilities
- **TypeScript** - Full type safety throughout the codebase
- **Error Boundaries** - Graceful error handling with user-friendly fallback UI

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Typography | Clash Display (display) + General Sans (body) + JetBrains Mono (code) |
| State | React Context (ConfigProvider) + localStorage |
| Validation | Zod |
| Testing | Jest |
| Deployment | Vercel |

---

## Getting Started

1. **Try the live demo** at [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)
2. **Configure features** at `/admin` > Configuration tab - toggle Express Checkout, Cash App Pay, Developer Mode, and capture settings
3. **Add products to cart** from the Shop page - use Buy Now buttons for Express Checkout
4. **Test checkout flows** - Standard and Cash App Pay on the checkout page
5. **Explore the Admin Panel** at `/admin` > Payment Operations to manage payments
6. **View Order History** at `/orders` to track completed transactions

For detailed testing instructions, see the [How to Use This Demo](/docs) guide.

---

**Version:** 3.0.0 | **Author:** [@zedzcodez](https://github.com/zedzcodez)
