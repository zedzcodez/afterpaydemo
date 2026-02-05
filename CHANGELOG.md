# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- Idempotency support via `requestId` for payment operations
  - Auth, Capture, Capture Full, Refund, and Void requests
  - Enables safe retries on timeout/network failures
  - Request ID visible in Developer Panel event details
- Free shipping option for orders over $100
  - Automatically appears as first option in Standard Checkout
  - Displays "FREE" badge with qualifying threshold note
- Dynamic shipping updates in Order Summary sidebar
  - Shipping and total update in real-time when selection changes
  - Subtle highlight animation on value changes
  - OSM widget amount includes shipping for accurate installment display
- Integration Flow Summary on confirmation page
  - Flow description and steps
  - Request configuration with doc links
  - Checkout adjustment details (deferred shipping)
  - Response data display
  - Copy button with JSON export
- Pay Monthly messaging option for OSM
- OSM integration code snippets with copy buttons
  - Displays actual merchant ID and locale from environment
  - Script tag, placement element, and environment variables
  - Available on checkout and shipping pages
- Payment Schedule Widget code section
  - Full initialization code with live configuration values
  - Checksum calculation note for deferred shipping
  - Copy button for quick integration

### Changed
- Order Summary sidebar widened on desktop (60/40 grid split)
  - Prevents Afterpay messaging widget from wrapping
  - Better readability for order details
- Order Summary now shows "Includes all applicable taxes, discounts, and promotions" note
- Admin Panel transaction status display moved above Actions section
  - Success/error messages now appear directly above Capture/Refund/Void buttons
  - Enhanced styling with success icon and dark mode support
- Developer Panel header redesign
  - Center-aligned title with bold styling for better visibility
  - Event count badge and flow type displayed inline
  - Resize tooltip appears on header hover
  - Improved resize handle with higher z-index for reliable drag
- Developer Panel events list redesign
  - Card-style event items with colored type icons
  - Individual expand/collapse per event
  - Type labels (REQUEST, RESPONSE, CALLBACK, REDIRECT)
  - Status badges and duration display
  - Overall timeline collapse/expand header
  - Collapsed by default for cleaner initial view
- Integration Flow events timeline on confirmation page
  - Collapsible timeline with status indicator dots
  - Consistent design with Developer Panel
- Developer Panel toggle button added to shipping page
- Afterpay messaging widget prevented from wrapping (CSS fix)
- Afterpay.js SDK check verifies `initializeForPopup` availability

### Fixed
- Amount Breakdown calculation in Admin Panel
  - Refund calculation correctly excludes void events
  - Afterpay API returns voids in `refunds` array with matching event IDs
  - Now filters by checking `refundId` against `events[].id`
- Event History no longer shows duplicate entries for voids

## [2.0.0] - 2026-02-04

### Added
- In-app documentation viewer at `/docs` with TOC navigation
- Webhook handler demo in Admin Panel
- Order history page (`/orders`) with individual deletion
- Developer panel enhancements:
  - Resizable panel (drag to adjust, persisted to localStorage)
  - Collapsed by default
  - Reverse chronological order
  - Copy as cURL
  - Export as JSON/HAR
- Dark mode with system preference detection
- Grouped navigation (Demo | Tools) with mobile slide-out menu
- Official Cash App Afterpay branding from CDN
- Checkout progress timeline component
- Error boundary components for graceful error handling

### Security
- Input validation with Zod schemas on all API routes
- Error message sanitization in API responses
- HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)

### Testing
- Jest test suite: 55 tests, 99.63% coverage on lib utilities
- Validation schema tests
- Error handling tests

## [1.0.0] - Initial Release

### Added
- Express Checkout with Afterpay.js
  - Integrated shipping (select in popup)
  - Deferred shipping (select on merchant site)
- Standard Checkout with API
  - Redirect flow (full page navigation)
  - Popup flow (modal overlay)
- Payment Admin Panel (`/admin`)
  - Payment lookup by Order ID
  - Capture (full and partial)
  - Refund (full and partial)
  - Void authorization
  - Amount breakdown visualization
- On-Site Messaging (OSM) integration
  - Product detail pages
  - Cart page
  - Checkout page
- Deferred/Immediate capture mode toggle
- Developer Panel with API request/response logging
- Code Viewer with implementation snippets
