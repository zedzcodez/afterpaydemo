# Afterpay Demo Shop

A comprehensive merchant checkout integration demo showcasing Afterpay's payment solutions. This demo serves merchants evaluating Afterpay, developers learning integration patterns, and stakeholders understanding payment flows.

## Features

### On-Site Messaging (OSM)
- Payment breakdown badges showing "4 interest-free payments of $X"
- Uses `<square-placement>` web component
- Available on Product Detail Pages (PDP), Cart, and Checkout
- Automatic installment calculation display

### Express Checkout (Afterpay.js)
Two shipping flow options with popup-based checkout:
- **Integrated Shipping**: Customer selects shipping within Afterpay popup using `onShippingAddressChange` callback
- **Deferred Shipping**: Customer returns to merchant site for shipping selection with Payment Schedule Widget

### Standard Checkout (API)
Server-side API integration with two checkout methods:
- **Redirect Flow**: Full page navigation to Afterpay
- **Popup Flow**: Modal overlay using Afterpay.js

### Capture Modes
Toggle between capture strategies from the Admin Panel:
- **Deferred Capture (default)**: Authorization only at checkout, capture later from Admin Panel (up to 13 days)
- **Immediate Capture**: Full payment capture at checkout completion

### Payment Admin Panel
Full payment management interface at `/admin`:
- **Merchant Configuration**: View min/max order thresholds and currency
- Payment lookup by Order ID
- Capture authorized payments
- Process refunds (full or partial)
- Void uncaptured authorizations
- Real-time API request/response logging
- **Webhook Demo**: Test webhook endpoint with simulated payment events

### Order History
Persistent order tracking at `/orders`:
- View all completed orders with status badges
- Order details including items, totals, and checkout flow used
- **Individual order deletion** - Remove specific orders from history
- Direct links to Admin Panel for order management
- localStorage persistence (last 20 orders)
- Cart is only cleared after successful payment authorization

### In-App Documentation
Access documentation directly within the app at `/docs`:
- **README tab**: Project overview and setup instructions
- **How to Use tab**: Detailed testing guide for all features
- **Table of contents**: Auto-generated navigation sidebar
- **Section highlighting**: Active section tracked on scroll
- **Quick links**: Fast access to Checkout Demo, Admin Panel, and API docs
- Full dark mode support with premium typography

### Developer Features
- **Code Viewer**: Implementation snippets for each checkout method
- **Developer Panel**: Enhanced API inspection tool with:
  - **Collapsed by default**: Click the panel header to expand and view logs
  - **Resizable panel**: Drag the top edge to adjust height (persisted to localStorage)
  - Real-time request/response logging (reverse-chronological order)
  - **Full server-side request data**: See exactly what's sent to Afterpay APIs, including `merchantReference`, `merchant` URLs, and transformed payloads
  - Complete URLs, path parameters, headers, and request/response bodies
  - Collapsible sections for headers and body data with size indicators
  - Filter by event type (Requests, Responses, Events, Redirects)
  - Search across labels, endpoints, and data content
  - **Copy as cURL**: One-click copy of any request as executable cURL command
  - **Export logs**: Download as JSON or HAR format (for browser DevTools import)
  - Links to Afterpay API documentation for each endpoint
- **Flow Logs**: Complete transaction timeline on confirmation page
- **Toggle Controls**: Compare different checkout approaches side-by-side
- **Official Afterpay Assets**: All checkout buttons use official Afterpay brand assets from CDN

### UI Features
- **Official Branding**: Cash App Afterpay logo from CDN with dark/light mode variants
- **Navigation**: Grouped navigation (Demo: Shop, Checkout | Tools: Admin, Orders, Docs) with mobile slide-out menu
- **Dark Mode**: System preference detection with manual toggle, persisted to localStorage
- **Checkout Progress Timeline**: Visual stepper showing Cart → Checkout → Shipping → Review → Confirm
- **Micro-interactions**: Cart bounce animation on add, sliding tab indicators, active nav indicators
- **Loading States**: Skeleton loaders for products, mint-colored spinners throughout
- **Error Boundaries**: Graceful error handling with user-friendly fallback UI

### Security Features
- **Input Validation**: All API routes validate input with Zod schemas
- **Error Sanitization**: API errors are sanitized before returning to clients
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy

### Testing
- **Jest Test Suite**: 55 unit tests with 99.63% coverage on lib utilities
- **Validation Tests**: Comprehensive tests for all Zod schemas
- **Error Handling Tests**: Tests for error sanitization patterns

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Afterpay Sandbox Merchant Account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd afterpay-demo-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Afterpay credentials (see Environment Variables below).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file with the following:

| Variable | Description | Required |
|----------|-------------|----------|
| `AFTERPAY_API_URL` | Afterpay API endpoint (`https://global-api-sandbox.afterpay.com` for sandbox) | Yes |
| `AFTERPAY_MERCHANT_ID` | Your Afterpay Merchant ID | Yes |
| `AFTERPAY_SECRET_KEY` | Your Afterpay Secret Key | Yes |
| `NEXT_PUBLIC_AFTERPAY_MPID` | OSM Merchant Profile ID | Yes |
| `NEXT_PUBLIC_OSM_PDP_PLACEMENT_ID` | OSM Placement ID for product pages | Yes |
| `NEXT_PUBLIC_OSM_CART_PLACEMENT_ID` | OSM Placement ID for cart/checkout | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's URL (must match exactly for popup flow) | Yes |

### Critical: NEXT_PUBLIC_APP_URL Configuration

**This URL MUST exactly match the protocol, host, and port where the app is running.**

This value is used for:
- `redirectConfirmUrl` - Where Afterpay redirects after checkout
- `redirectCancelUrl` - Where Afterpay redirects on cancellation
- `popupOriginUrl` - Validates the origin for popup method

If `popupOriginUrl` doesn't match `window.location.origin`, the browser won't dispatch the JavaScript `onComplete` event, causing popup flow to fail silently.

## Project Structure

```
/app
  page.tsx                      # Homepage with product grid
  error.tsx                     # Global error boundary
  /products/[id]/page.tsx       # Product detail page
  /cart/page.tsx                # Shopping cart
  /checkout/page.tsx            # Checkout (Express + Standard tabs)
  /checkout/error.tsx           # Checkout-specific error boundary
  /checkout/review/page.tsx     # Standard checkout review page
  /checkout/shipping/page.tsx   # Deferred shipping selection
  /confirmation/page.tsx        # Order confirmation with flow logs
  /orders/page.tsx              # Order history page
  /admin/page.tsx               # Payment management panel
  /docs/page.tsx                # In-app documentation viewer
  /api/docs
    /readme/route.ts            # Serve README.md content
    /how-to-use/route.ts        # Serve how-to-use.md content
  /api/afterpay
    /checkout/route.ts          # Create checkout
    /auth/route.ts              # Authorize payment
    /capture/route.ts           # Capture payment (partial)
    /capture-full/route.ts      # Capture full payment
    /refund/route.ts            # Refund payment
    /void/route.ts              # Void payment
    /payment/[orderId]/route.ts # Get payment details
    /configuration/route.ts     # Get merchant configuration
  /api/webhooks/afterpay
    /route.ts                   # Webhook endpoint for payment notifications

/components
  Header.tsx                    # Navigation with cart icon and dark mode toggle
  ProductCard.tsx               # Product display card with dark mode support
  ProductGrid.tsx               # Homepage product grid with skeleton loading
  CartProvider.tsx              # Cart state (Context + localStorage + animation trigger)
  ThemeProvider.tsx             # Dark mode state (Context + localStorage + system preference)
  CheckoutProgress.tsx          # Visual checkout progress stepper
  LoadingSpinner.tsx            # Reusable mint-colored loading spinner
  ErrorBoundary.tsx             # Reusable error boundary component
  OSMPlacement.tsx              # Afterpay OSM wrapper
  CheckoutExpress.tsx           # Express checkout component
  CheckoutStandard.tsx          # Standard checkout component
  CodeViewer.tsx                # Expandable code snippets
  FlowLogsDevPanel.tsx          # Enhanced dev panel with filters, search, cURL export, HAR export
  DevPanel.tsx                  # Legacy developer panel component

/lib
  products.ts                   # Static product data
  cart.ts                       # Cart utilities
  afterpay.ts                   # Server-side Afterpay API client
  flowLogs.ts                   # Flow logging utilities
  types.ts                      # TypeScript interfaces
  errors.ts                     # Error sanitization utilities
  validation.ts                 # Zod validation schemas
  webhooks.ts                   # Webhook types and utilities
  orders.ts                     # Order persistence utilities

/__tests__
  /lib
    errors.test.ts              # Error utility tests
    validation.test.ts          # Validation schema tests
    products.test.ts            # Product utility tests
```

## API Endpoints

This demo wraps Afterpay's v2 API endpoints. Each local endpoint maps to an Afterpay API call:

| Local Endpoint | Afterpay API | Description | Docs |
|----------------|--------------|-------------|------|
| `POST /api/afterpay/checkout` | `POST /v2/checkouts` | Create checkout session | [Create Checkout](https://developers.cash.app/cash-app-afterpay/reference/create-checkout) |
| `POST /api/afterpay/auth` | `POST /v2/payments/auth` | Authorize payment | [Authorise Payment](https://developers.cash.app/cash-app-afterpay/reference/authorise-payment) |
| `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` | Capture payment (partial) | [Capture Payment](https://developers.cash.app/cash-app-afterpay/reference/capture-payment) |
| `POST /api/afterpay/capture-full` | `POST /v2/payments/capture` | Capture full payment | [Capture Payment](https://developers.cash.app/cash-app-afterpay/reference/capture-payment) |
| `POST /api/afterpay/refund` | `POST /v2/payments/{id}/refund` | Process refund | [Create Refund](https://developers.cash.app/cash-app-afterpay/reference/create-refund) |
| `POST /api/afterpay/void` | `POST /v2/payments/{id}/void` | Void authorization | [Void Payment](https://developers.cash.app/cash-app-afterpay/reference/void-payment) |
| `GET /api/afterpay/payment/[id]` | `GET /v2/payments/{id}` | Get payment details | [Get Payment](https://developers.cash.app/cash-app-afterpay/reference/get-payment) |
| `POST /api/afterpay/configuration` | `GET /v2/configuration` | Get merchant config | [Get Configuration](https://developers.cash.app/cash-app-afterpay/reference/get-configuration) |
| `POST /api/webhooks/afterpay` | - | Receive webhook events (demo) | [Webhook Events](https://developers.afterpay.com/afterpay-online/reference/webhook-events) |
| `GET /api/webhooks/afterpay` | - | Webhook health check | - |

**API Base URL (Sandbox)**: `https://global-api-sandbox.afterpay.com`

## Testing

### Unit Tests

Run the test suite:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Current coverage: **55 tests, 99.63% statement coverage** on lib utilities.

### Sandbox Testing

Use Afterpay's sandbox test accounts to complete checkout flows:

| Email | Phone | Result |
|-------|-------|--------|
| `approved@afterpay.com` | Any | Approved |
| `declined@afterpay.com` | Any | Declined |

### Test Credit Cards

To test different payment outcomes, use these CVV codes:

| CVV | Result |
|-----|--------|
| `000` | Approved |
| `051` | Declined |

See [Afterpay Test Environments](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#test-credit-cards) for more test card options.

The sandbox environment simulates the full payment experience without processing real payments.

## Deployment

### Vercel (Recommended)

```bash
npm run build
```

Or deploy directly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Important**: Update `NEXT_PUBLIC_APP_URL` to match your production domain.

## Documentation

- **[In-App Documentation](/docs)** - View README and How-to-Use Guide within the app with TOC navigation
- **[How to Use This Demo](./how-to-use.md)** - Detailed guide for testing all features
- [Afterpay Developer Documentation](https://developers.cash.app/cash-app-afterpay)
- [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging)
- [Express Checkout Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout)
- [Deferred Capture Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture)
- [Popup Method Reference](https://developers.afterpay.com/afterpay-online/reference/popup-method)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS with custom design system
- **Typography**: Outfit (display) + Plus Jakarta Sans (body)
- **Images**: Unsplash (optimized via Next.js Image)
- **State Management**: React Context with localStorage persistence
- **Deployment**: Vercel-ready

## Design System

The demo features a polished, distinctive UI built on Afterpay's brand colors with full dark mode support:

### Colors
- **Primary**: Afterpay Mint (`#B2FCE4`) - Used for CTAs, accents, and highlights
- **Mint Dark**: `#8EEBC8` - Hover states
- **Mint Light**: `#D4FEF0` - Subtle backgrounds
- **Dark Mode**: Charcoal backgrounds with mint accents

### Typography
- **Display Font**: Outfit - Bold, geometric sans-serif for headings
- **Body Font**: Plus Jakarta Sans - Clean, readable for body text

### Components
- **Buttons**: Three variants - `btn-primary` (mint), `btn-secondary` (black), `btn-outline`
- **Cards**: Elevated with shadows, hover lift effects, and mint glow
- **Forms**: Styled inputs with mint focus ring, custom checkboxes/radios
- **Progress Stepper**: Visual checkout timeline with completed step indicators
- **Loading States**: Skeleton screens and mint-colored spinners

### Animations
- Page load: Staggered fade-in-up animations
- Cards: Scale and shadow transitions on hover
- Buttons: Scale transforms on hover/active states
- Cart icon: Bounce animation when items added
- Tab indicator: Smooth slide transitions between checkout methods
- Progress bar: Animated segments in admin amount breakdown

### Dark Mode
- Toggle in header (sun/moon icon)
- System preference detection
- Persisted to localStorage
- Mint accent colors preserved in dark theme

## Roadmap

### Completed
- [x] Express Checkout with integrated/deferred shipping
- [x] Standard Checkout with redirect/popup modes
- [x] Payment Admin Panel with capture/refund/void
- [x] Developer Panel with cURL/HAR export (collapsed by default)
- [x] Order History with localStorage persistence and individual deletion
- [x] Webhook Handler Demo
- [x] Error Boundaries for graceful error handling
- [x] Jest Test Suite (55 tests, 99.63% coverage)
- [x] Security: Input validation with Zod
- [x] Security: Error message sanitization
- [x] Security: HTTP security headers
- [x] In-App Documentation (`/docs`) with tabbed interface and TOC sidebar
- [x] Navigation redesign with grouped items and mobile menu
- [x] Official Cash App Afterpay branding

### In Progress / Planned

#### Security Enhancements
- [ ] **S2: Authentication middleware** - Add session-based auth for sensitive API routes
- [ ] **S5: CSRF protection** - Add CSRF tokens for state-changing operations
- [ ] **S9: Rate limiting** - Prevent API abuse with request throttling

#### Feature Enhancements
- [ ] **E6: Mobile-optimized views** - Better responsive design for Developer Panel and Admin
- [ ] **E7: Analytics/event tracking demo** - Show checkout funnel tracking patterns
- [ ] **E8: Multi-currency support** - Demonstrate international merchant capabilities
- [ ] **E12: i18n/Localization** - Multi-language support

#### Testing & Quality
- [ ] **E2: Integration tests** - End-to-end checkout flow tests
- [ ] **Component tests** - React Testing Library tests for UI components

See [docs/plans/2026-02-04-app-analysis-and-roadmap.md](./docs/plans/2026-02-04-app-analysis-and-roadmap.md) for detailed implementation plans.

## License

MIT
