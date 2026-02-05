# Afterpay Demo App Summary

A comprehensive merchant checkout integration demo showcasing Afterpay's Buy Now, Pay Later (BNPL) payment solutions. Built with Next.js 16, React 19, and TypeScript.

**Live Demo:** [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)

---

## What This Demo Does

This application demonstrates how merchants integrate Afterpay into their e-commerce checkout experience. It provides a fully functional sandbox environment where you can:

- **Test checkout flows** - Express and Standard checkout with multiple configuration options
- **Process payments** - Authorize, capture, refund, and void operations
- **View real-time API logs** - See exactly what's sent to and received from Afterpay
- **Explore OSM messaging** - Payment breakdown badges on product and cart pages

---

## Core Features

| Category | Features |
|----------|----------|
| **Checkout Flows** | Express Checkout (popup with integrated/deferred shipping), Standard Checkout (redirect/popup modes) |
| **Payment Operations** | Deferred & Immediate capture, partial/full refunds, void authorization |
| **On-Site Messaging** | "Pay in 4" and "Pay Monthly" badges on PDP, cart, and checkout |
| **Admin Panel** | Payment lookup, capture, refund, void, event history |
| **Developer Tools** | API request/response logging, cURL/HAR export, code snippets, flow summaries |
| **Order Management** | Persistent order history, individual deletion, status tracking |

---

## Who Benefits From This Demo

### Merchants Evaluating Afterpay

See the full customer experience before integrating - from product pages with payment badges through checkout completion. Understand all available checkout flows and capture strategies without writing any code.

**Key value:**
- Visual preview of OSM badge placements
- Compare Express vs Standard checkout UX
- Understand deferred vs immediate capture implications

### Integration Developers

Learn API patterns with real request/response logging. The Developer Panel shows exactly what's sent to Afterpay APIs, with cURL export for debugging and code snippets for each method.

**Key value:**
- Token flow visualization (Checkout Token → Order Token → Order ID)
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
| POST /api/afterpay/capture | POST /v2/payments/{id}/capture | Partial capture |
| POST /api/afterpay/capture-full | POST /v2/payments/capture | Auth + Capture |
| POST /api/afterpay/refund | POST /v2/payments/{id}/refund | Refund payment |
| POST /api/afterpay/void | POST /v2/payments/{id}/void | Void authorization |

### Security

- **Input Validation** - All API routes validate input with Zod schemas
- **Error Sanitization** - API errors are sanitized before returning to clients
- **Security Headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### Quality

- **Test Coverage** - 55 unit tests with 99.63% coverage on lib utilities
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
| Typography | Outfit (display) + Plus Jakarta Sans (body) |
| State | React Context + localStorage |
| Validation | Zod |
| Testing | Jest |
| Deployment | Vercel |

---

## Getting Started

1. **Try the live demo** at [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)
2. **Add products to cart** from the Shop page
3. **Test checkout flows** - try Express and Standard options
4. **Explore the Admin Panel** at `/admin` to manage payments
5. **View Order History** at `/orders` to track completed transactions

For detailed testing instructions, see the [How to Use This Demo](/docs) guide.

---

**Version:** 2.6.0 | **Author:** [@zedzcodez](https://github.com/zedzcodez)
