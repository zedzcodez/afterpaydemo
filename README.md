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
- **Custom Credentials**: Use your own sandbox API credentials to test
- **Merchant Configuration**: View min/max order thresholds and currency
- Payment lookup by Order ID
- Capture authorized payments
- Process refunds (full or partial)
- Void uncaptured authorizations
- Real-time API request/response logging

### Developer Features
- **Code Viewer**: Implementation snippets for each checkout method
- **Developer Panel**: API requests/responses displayed in real-time
- **Flow Logs**: Complete transaction timeline on confirmation page
- **Toggle Controls**: Compare different checkout approaches side-by-side

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
  /products/[id]/page.tsx       # Product detail page
  /cart/page.tsx                # Shopping cart
  /checkout/page.tsx            # Checkout (Express + Standard tabs)
  /checkout/review/page.tsx     # Standard checkout review page
  /checkout/shipping/page.tsx   # Deferred shipping selection
  /confirmation/page.tsx        # Order confirmation with flow logs
  /admin/page.tsx               # Payment management panel
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
  Header.tsx                    # Navigation with cart icon
  ProductCard.tsx               # Product display card
  ProductGrid.tsx               # Homepage product grid
  CartProvider.tsx              # Cart state (Context + localStorage)
  OSMPlacement.tsx              # Afterpay OSM wrapper
  CheckoutExpress.tsx           # Express checkout component
  CheckoutStandard.tsx          # Standard checkout component
  CodeViewer.tsx                # Expandable code snippets
  FlowLogsDevPanel.tsx          # API request/response panel

/lib
  products.ts                   # Static product data
  cart.ts                       # Cart utilities
  afterpay.ts                   # Server-side Afterpay API client
  flowLogs.ts                   # Flow logging utilities
  types.ts                      # TypeScript interfaces
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/afterpay/checkout` | POST | Create Afterpay checkout |
| `/api/afterpay/auth` | POST | Authorize payment |
| `/api/afterpay/capture` | POST | Capture payment (with amount) |
| `/api/afterpay/capture-full` | POST | Capture full payment (token only) |
| `/api/afterpay/refund` | POST | Refund payment |
| `/api/afterpay/void` | POST | Void payment |
| `/api/afterpay/payment/[orderId]` | GET | Get payment details |
| `/api/afterpay/configuration` | POST | Get merchant configuration (supports custom credentials) |

## Testing

Use Afterpay's sandbox test accounts to complete checkout flows:

| Email | Phone | Result |
|-------|-------|--------|
| `approved@afterpay.com` | Any | Approved |
| `declined@afterpay.com` | Any | Declined |

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

- **[How to Use This Demo](./how-to-use.md)** - Detailed guide for testing all features
- [Afterpay Developer Documentation](https://developers.cash.app/cash-app-afterpay)
- [On-Site Messaging Guide](https://developers.cash.app/cash-app-afterpay/guides/afterpay-messaging)
- [Express Checkout Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/additional-features/express-checkout)
- [Deferred Capture Guide](https://developers.cash.app/cash-app-afterpay/guides/api-development/api-quickstart/deferred-capture)
- [Popup Method Reference](https://developers.afterpay.com/afterpay-online/reference/popup-method)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS with Afterpay brand colors
- **State Management**: React Context with localStorage persistence
- **Deployment**: Vercel-ready

## License

MIT
