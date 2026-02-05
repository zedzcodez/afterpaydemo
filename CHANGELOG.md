# Changelog

All notable changes to this project are documented here.

## [2.6.0] - 2026-02-05

### Added
- Demo App Summary tab in User Guide (`/docs`)
  - Overview of app features and capabilities
  - Target audiences with specific benefits
  - Technical highlights and API coverage
  - Tab navigation with content caching
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
- Scroll-to-top button on all pages
  - Accessible, centered at bottom of page
  - Bouncy animation with Afterpay mint color on hover
  - Respects prefers-reduced-motion

### Changed
- Order Summary sidebar widened on desktop (60/40 grid split)
- Order Summary now shows "Includes all applicable taxes, discounts, and promotions" note
- Admin Panel transaction status display moved above Actions section
- Developer Panel header redesign with center-aligned title
- Developer Panel resize handle improved with higher z-index
- Orders page demo notice moved to top of list

### Fixed
- Amount Breakdown calculation in Admin Panel
  - Refund calculation correctly excludes void events
- Event History no longer shows duplicate entries for voids

## [2.5.0] - 2026-02-04

### Changed
- OSM Dark Mode Support: Added light background containers for OSM widget in dark mode
- Flow Log Deduplication: Implemented duplicate detection in `addFlowLog()`
- Checkout Review Messaging: Changed "Payment Confirmed" to "Ready to Complete"
- Official Afterpay Logos: Replaced custom text badges with official Cash App Afterpay logos

## [2.4.0] - 2026-02-04

### Added
- Integration Flow Summary on confirmation page
  - Flow description and steps
  - Request configuration with doc links
  - Checkout adjustment details (deferred shipping)
  - Response data display
  - Copy button with JSON export
- Pay Monthly messaging option for OSM
- OSM integration code snippets with copy buttons
- Payment Schedule Widget code section

### Changed
- User Guide: Comprehensive documentation restructure with table of contents
- Navigation Redesign: Centered nav with grouped sections (Demo | Tools)
- Header Cleanup: Renamed "Docs" to "User Guide", fixed label wrapping

## [2.3.0] - 2026-02-04

### Added
- Developer Panel enhancements:
  - Resizable panel with persistent height
  - Copy as cURL functionality
  - Export as JSON/HAR
  - Filter chips and search
  - Reverse-chronological display order
- Developer Panel events list redesign
  - Card-style event items with colored type icons
  - Individual expand/collapse per event
  - Type labels (REQUEST, RESPONSE, CALLBACK, REDIRECT)
  - Status badges and duration display

## [2.2.0] - 2026-02-04

### Added
- Webhook Handler Demo: Interactive webhook testing in Admin Panel
- Order History: Persistent order tracking with individual deletion
- Admin Panel: Full payment management with capture, refund, void operations

### Security
- Input validation with Zod schemas on all API routes
- Error message sanitization in API responses
- HTTP security headers

### Testing
- Jest test suite: 55 tests, 99.63% coverage on lib utilities

## [2.1.0] - 2026-02-04

### Added
- Express Checkout with Afterpay.js
  - Integrated shipping (select in popup)
  - Deferred shipping (select on merchant site)
- Standard Checkout with API
  - Redirect flow (full page navigation)
  - Popup flow (modal overlay)
- Capture Modes: Toggle between deferred and immediate capture
- Developer Panel with API request/response logging
- Code Viewer with implementation snippets

## [2.0.0] - 2026-02-04

### Added
- Core shopping experience with product catalog and cart
- On-Site Messaging (OSM) integration
  - Product detail pages
  - Cart page
  - Checkout page
- Dark mode with system preference detection
- Mobile-responsive design
- In-app documentation viewer at `/docs` with TOC navigation
- Grouped navigation (Demo | Tools) with mobile slide-out menu
- Official Cash App Afterpay branding from CDN
- Checkout progress timeline component
- Error boundary components for graceful error handling
