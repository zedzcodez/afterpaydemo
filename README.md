# Afterpay Demo Shop

> **Demo Users:** Visit the live demo at [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)
> and see [how-to-use.md](./how-to-use.md) for testing instructions.
>
> This README is for developers maintaining or extending this project.

A configurable merchant checkout demo platform showcasing Afterpay's payment solutions. Features a centralized configuration system, inline Buy Now express checkout, Cash App Pay, developer mode toggle, and a full payment admin panel. Built for merchants evaluating Afterpay, developers learning integration patterns, and stakeholders understanding payment flows.

**Live Demo:** [afterpay-demo-v2.vercel.app](https://afterpay-demo-v2.vercel.app)

## Features

### Configuration System
Centralized app configuration via React Context:
- `ConfigProvider` wraps the app (ThemeProvider > ConfigProvider > CartProvider)
- Config stored in localStorage under key `"afterpay-demo-config"`
- `useConfig()` hook provides `{ config, updateConfig, resetConfig }`
- Controls Express Checkout (enabled/type), Cash App Pay (enabled), Standard Checkout (method), Capture Mode, and Developer Mode
- All settings saved instantly from the Admin Configuration tab

### On-Site Messaging (OSM)
- Payment breakdown badges showing "4 interest-free payments of $X"
- Uses `<square-placement>` web component
- Available on Product Detail Pages (PDP), Cart, and Checkout
- Automatic installment calculation display
- Always visible regardless of Developer Mode setting (consumer-facing)

### Buy Now Express Checkout (Afterpay.js)
Popup-based express checkout launched inline via Buy Now buttons (not a checkout page tab):
- **Buy Now buttons** appear on product detail pages, product grid cards, cart page, and mini-cart dropdown
- Two shipping flow options configured in Admin:
  - **Integrated Shipping**: Customer selects shipping within Afterpay popup using `onShippingAddressChange` callback
  - **Deferred Shipping**: Customer returns to merchant site for shipping selection with Payment Schedule Widget
- Uses `useBuyNowCheckout` hook and `BuyNowButton` component
- Only visible when `config.expressCheckout.enabled` is true

### Standard Checkout (API)
Server-side API integration at `/checkout` with two checkout methods:
- **Redirect Flow**: Full page navigation to Afterpay
- **Popup Flow**: Modal overlay using Afterpay.js
- "Pay with Afterpay" official branded SVG button (`AfterpayButton` component)
- Shows as the only option when Cash App Pay is disabled; shown alongside Cash App Pay tab when enabled

### Cash App Pay
Pay-now checkout using Cash App:
- **Desktop**: Displays a QR code for customers to scan with their Cash App
- **Mobile**: Redirects customers directly to the Cash App
- Uses the same Afterpay API with `isCashAppPay: true` flag
- SDK-rendered button with full-width dark theme
- Supports both deferred and immediate capture modes

### Capture Modes
Toggle between capture strategies from the Admin Configuration tab:
- **Deferred Capture (default)**: Authorization only at checkout, capture later from Admin Panel (up to 13 days)
- **Immediate Capture**: Full payment capture at checkout completion
- Configuration managed centrally via `ConfigProvider` (replaces old `afterpay_capture_mode` localStorage key)

### Payment Admin Panel
Full management interface at `/admin` with two tabs:
- **Configuration Tab**: Express Checkout toggle + type, Standard Checkout method, Cash App Pay toggle, Capture Mode, Developer Mode, Merchant Config
- **Payment Operations Tab**: Payment lookup by Order ID, capture authorized payments, process refunds (full or partial), void uncaptured authorizations, real-time API request/response logging
- All configuration settings saved instantly via ConfigProvider (no save button)

### Order History
Persistent order tracking at `/orders`:
- View all completed orders with status badges
- Order details including items, totals, and checkout flow used
- **Individual order deletion** - Remove specific orders from history
- Direct links to Admin Panel for order management
- localStorage persistence (last 20 orders)
- Cart is only cleared after successful payment authorization

### In-App Documentation
Access the testing guide directly within the app at `/docs`:
- **How to Use Guide**: Detailed testing guide for all features
- **Table of contents**: Auto-generated navigation sidebar
- **Section highlighting**: Active section tracked on scroll
- **Quick links**: Fast access to Checkout Demo, Admin Panel, and API docs
- Full dark mode support with premium typography

### Developer Mode
Global toggle controlled from the Admin Configuration tab:
- **When OFF**: Hides code snippets, flow logs, developer panel, and API metadata across all pages
- **When ON**: Shows full developer tools including terminal-style dark panels
- Admin page always shows full content regardless of Developer Mode setting
- OSM widgets always visible (consumer-facing)
- Header shows "DEVELOPER MODE" indicator bar when ON

### Developer Features
Visible only when Developer Mode is enabled:
- **Code Viewer**: Implementation snippets for each checkout method
- **Developer Panel**: Enhanced API inspection tool (`FlowLogsDevPanel.tsx`) with:
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
- **Integration Flow Summary**: On the confirmation page, view a summary of your checkout flow including:
  - Flow description and steps executed
  - Critical request configuration (mode, popupOriginUrl, checksums)
  - Checkout adjustment breakdown (deferred shipping flows)
  - Key response data with links to Afterpay documentation
  - Copy button for sharing flow configuration
- **Official Afterpay Assets**: All checkout buttons use official Afterpay brand assets from CDN

### UI Features
- **Official Branding**: Cash App Afterpay logo from CDN with dark/light mode variants
- **Navigation**: Flat nav (Shop, Admin, Orders, User Guide) with mobile slide-out menu
- **Mini-Cart Dropdown**: Cart icon click reveals dropdown with items, Buy Now button, Continue with Afterpay button, and View Full Cart link
- **Developer Mode Indicator**: Visible bar below header when Developer Mode is ON
- **Buy Now Buttons**: Custom mint "BUY NOW [afterpay-logo]" buttons on product pages, grid cards, cart, and mini-cart (theme-aware, config-gated)
- **Branded Checkout Buttons**: `AfterpayButton` component with official SVG branded buttons ('continue' variant for cart, 'pay' variant for checkout)
- **Dark Mode**: System preference detection with manual toggle, persisted to localStorage
- **Micro-interactions**: Cart bounce animation on add, sliding tab indicators, active nav indicators
- **Loading States**: Skeleton loaders for products, mint-colored spinners throughout
- **Error Boundaries**: Graceful error handling with user-friendly fallback UI

### Security Features
- **Input Validation**: All API routes validate input with Zod schemas
- **Error Sanitization**: API errors are sanitized before returning to clients
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Referrer-Policy

### Testing
- **Jest Test Suite**: 139 unit tests across 10 test suites covering lib utilities
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
   git clone https://github.com/zedzcodez/afterpaydemo.git
   cd afterpaydemo
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
  layout.tsx                    # Root layout with providers
  page.tsx                      # Homepage with product grid
  error.tsx                     # Global error boundary
  /products/[id]/page.tsx       # Product detail page
  /cart/page.tsx                # Shopping cart
  /checkout/page.tsx            # Checkout (Standard + Cash App Pay tabs)
  /checkout/error.tsx           # Checkout-specific error boundary
  /checkout/review/page.tsx     # Standard checkout review page
  /checkout/shipping/page.tsx   # Deferred shipping selection
  /confirmation/page.tsx        # Order confirmation with flow logs
  /orders/page.tsx              # Order history page
  /admin/page.tsx               # Payment management panel (Configuration + Payment Operations tabs)
  /docs/page.tsx                # In-app documentation viewer
  /api/docs
    /readme/route.ts            # Serve README.md content
    /how-to-use/route.ts        # Serve how-to-use.md content
    /summary/route.ts           # Serve documentation summary
  /api/afterpay
    /checkout/route.ts          # Create checkout
    /auth/route.ts              # Authorize payment
    /capture/route.ts           # Capture payment (partial)
    /capture-full/route.ts      # Capture full payment
    /refund/route.ts            # Refund payment
    /void/route.ts              # Void payment
    /payment/[orderId]/route.ts # Get payment details
    /configuration/route.ts     # Get merchant configuration

/components
  Header.tsx                    # Flat navigation (Shop, Admin, Orders, User Guide) with mini-cart dropdown and dev mode indicator
  ProductCard.tsx               # Product display card with dark mode support
  ProductGrid.tsx               # Homepage product grid with skeleton loading
  CartProvider.tsx              # Cart state (Context + localStorage + animation trigger)
  ConfigProvider.tsx            # App configuration React Context (config stored in localStorage)
  ThemeProvider.tsx             # Dark mode state (Context + localStorage + system preference)
  BuyNowButton.tsx              # Custom mint "BUY NOW" express checkout button (config-gated)
  AfterpayButton.tsx            # Official SVG branded buttons ('continue' and 'pay' variants)
  CheckoutProgress.tsx          # Visual checkout progress stepper (legacy, not used on checkout page)
  LoadingSpinner.tsx            # Reusable mint-colored loading spinner
  ErrorBoundary.tsx             # Reusable error boundary component
  OSMPlacement.tsx              # Afterpay OSM wrapper
  CheckoutStandard.tsx          # Standard checkout component
  CheckoutCashApp.tsx           # Cash App Pay checkout component
  CashAppInfoSection.tsx        # Cash App Pay developer docs/code snippets
  CodeViewer.tsx                # Expandable code snippets
  FlowLogsDevPanel.tsx          # Enhanced dev panel with filters, search, cURL export, HAR export (primary)
  DevPanel.tsx                  # Legacy developer panel component

/components/confirmation
  ConfirmationContent.tsx       # Main confirmation page content
  FlowLogsSection.tsx           # Flow logs timeline section
  FlowSummarySection.tsx        # Integration flow summary section
  index.ts                      # Barrel export

/hooks
  useBuyNowCheckout.ts          # Express checkout hook for Buy Now buttons
  useAfterpayReady.ts           # SDK readiness polling hook

/lib
  config.ts                     # App config types, defaults, and utilities
  products.ts                   # Static product data
  cart.ts                       # Cart utilities
  afterpay.ts                   # Server-side Afterpay API client
  flowLogs.ts                   # Flow logging utilities
  types.ts                      # TypeScript interfaces
  errors.ts                     # Error sanitization utilities
  validation.ts                 # Zod validation schemas
  checkout-client.ts            # Checkout token creation helper
  payment-client.ts             # Payment capture/auth client helpers
  storage-keys.ts               # Centralized storage key constants
  constants.ts                  # App constants
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
| `POST /api/afterpay/checkout` | `POST /v2/checkouts` | Create checkout session (supports `isCashAppPay: true` for Cash App Pay) | [Create Checkout](https://developers.cash.app/cash-app-afterpay/api-reference/reference/checkouts/create-checkout-1) |
| `POST /api/afterpay/auth` | `POST /v2/payments/auth` | Authorize payment | [Authorise Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/auth) |
| `POST /api/afterpay/capture` | `POST /v2/payments/{id}/capture` | Capture payment (partial) | [Capture Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |
| `POST /api/afterpay/capture-full` | `POST /v2/payments/capture` | Capture full payment | [Capture Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/capture-payment) |
| `POST /api/afterpay/refund` | `POST /v2/payments/{id}/refund` | Process refund | [Create Refund](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/create-refund) |
| `POST /api/afterpay/void` | `POST /v2/payments/{id}/void` | Void authorization | [Void Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/void-payment) |
| `GET /api/afterpay/payment/[id]` | `GET /v2/payments/{id}` | Get payment details | [Get Payment](https://developers.cash.app/cash-app-afterpay/api-reference/reference/payments/get-payment-by-order-id) |
| `POST /api/afterpay/configuration` | `GET /v2/configuration` | Get merchant config | [Get Configuration](https://developers.cash.app/cash-app-afterpay/api-reference/reference/configuration/get-configuration) |

**API Base URL (Sandbox)**: `https://global-api-sandbox.afterpay.com`

## Testing

### Unit Tests

Run the test suite:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Current coverage: **139 tests across 10 test suites** covering lib utilities.

### Sandbox Testing

#### Test Customer Accounts

You can create test customer accounts in the sandbox environment within your test checkout flow. Each customer account requires a unique email address and phone number.

> **Note:** No SMS messages are sent in the sandbox. Use `111111` as the verification code.

See [Test Customer Accounts](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#test-customer-accounts) and [Sandbox Business Hub](https://developers.cash.app/cash-app-afterpay/guides/api-development/test-environments#sandbox-business-hub) for more details.

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

- **[In-App Documentation](https://afterpay-demo-v2.vercel.app/docs)** - View the How-to-Use Guide within the app with TOC navigation
- **[how-to-use.md](./how-to-use.md)** - Detailed guide for testing all features
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical overview for maintainers
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- [Afterpay Developer Documentation](https://developers.cash.app/cash-app-afterpay)
- [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging)
- [Express Checkout Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout)
- [Deferred Capture Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture)
- [Popup Method Reference](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/create-a-checkout#implement-the-popup-method)
- [Cash App Pay Integration Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS with custom design system
- **Typography**: Clash Display (display) + General Sans (body) + JetBrains Mono (code)
- **Images**: Unsplash (optimized via Next.js Image)
- **State Management**: React Context with localStorage persistence
- **Deployment**: Vercel-ready

## Design System

The demo features a bold, brand-forward UI built on Afterpay's mint-dominant palette with full dark mode support:

### Colors
- **Primary**: Afterpay Mint (`#B2FCE4`) - Used for CTAs, accents, and highlights
- **Mint Dark**: `#8EEBC8` - Hover states
- **Mint Light**: `#D4FEF0` - Subtle backgrounds
- **Dark Mode**: Charcoal backgrounds with mint accents
- **Terminal**: Dark background with green/amber text for Developer Mode panels

### Typography
- **Display Font**: Clash Display (via Fontshare CDN) - Bold, brand-forward display font for headings
- **Body Font**: General Sans (via Fontshare CDN) - Clean, modern sans-serif for body text
- **Code Font**: JetBrains Mono (via Google Fonts) - Monospace font for code snippets and developer panels

### Components
- **Buttons**: Three variants - `btn-primary` (mint), `btn-secondary` (black), `btn-outline`
- **Buy Now Button**: Custom mint button with Afterpay logo for express checkout
- **Afterpay Button**: Official SVG branded buttons for cart ('continue') and checkout ('pay')
- **Cards**: Elevated with shadows, hover lift effects, and mint glow
- **Forms**: Styled inputs with mint focus ring, custom checkboxes/radios
- **Loading States**: Skeleton screens and mint-colored spinners

### Animations
- Page load: Staggered fade-in-up animations
- Cards: Scale and shadow transitions on hover
- Buttons: Scale transforms on hover/active states
- Cart icon: Bounce animation when items added
- Tab indicator: Smooth slide transitions between checkout methods
- Progress bar: Animated segments in admin amount breakdown

### Dark Mode
- Toggle in header navigation ("Dark Mode" / "Light Mode" text labels)
- System preference detection
- Persisted to localStorage
- Mint accent colors preserved in dark theme

## Roadmap

### Completed
- [x] Express Checkout with integrated/deferred shipping
- [x] Buy Now inline express checkout via product pages, grid cards, cart, and mini-cart (v3.0)
- [x] Standard Checkout with redirect/popup modes
- [x] Cash App Pay checkout (QR on desktop, redirect on mobile)
- [x] Configurable demo platform with centralized ConfigProvider (v3.0)
- [x] Developer Mode toggle - show/hide developer tools globally (v3.0)
- [x] Admin Configuration tab with instant-save settings (v3.0)
- [x] Payment Admin Panel with capture/refund/void
- [x] Developer Panel with cURL/HAR export (collapsed by default)
- [x] Order History with localStorage persistence and individual deletion
- [x] Error Boundaries for graceful error handling
- [x] Jest Test Suite (139 tests across 10 test suites)
- [x] Security: Input validation with Zod
- [x] Security: Error message sanitization
- [x] Security: HTTP security headers
- [x] In-App Documentation (`/docs`) with TOC sidebar
- [x] Flat navigation with mini-cart dropdown and developer mode indicator (v3.0)
- [x] Official Cash App Afterpay branding
- [x] Branded checkout buttons (BuyNowButton, AfterpayButton) (v3.0)
- [x] Integration Flow Summary on confirmation page
- [x] Pay Monthly messaging option for OSM
- [x] Documentation restructure and audit

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

See [docs/plans/roadmap.md](./docs/plans/roadmap.md) for detailed implementation plans.

## Author

**[@zedzcodez](https://github.com/zedzcodez)**

## License

MIT
