import type { NextConfig } from "next";

// Content-Security-Policy directives for the app.
// External resources loaded at runtime:
//   Scripts:  js-sandbox.squarecdn.com (Square/Cash App SDK), portal.sandbox.afterpay.com (Afterpay.js),
//             sandbox.kit.cash.app (Cash App Pay button/QR SDK)
//   Styles:   api.fontshare.com (Fontshare CSS), sandbox.kit.cash.app (Cash App Pay CSS)
//   Fonts:    cdn.fontshare.com (Fontshare font files), cash-f.squarecdn.com (Cash App fonts)
//   Images:   static.afterpaycdn.com, static.afterpay.com (logos/icons), images.unsplash.com (product images),
//             sandbox.api.cash.app (QR codes), franklin-assets.s3.amazonaws.com (Cash App merchant assets)
//   Connect:  portal.sandbox.afterpay.com, portalapi.us-sandbox.afterpay.com (SDK API calls),
//             sandbox.kit.cash.app, api.lab.amplitude.com, *.ingest.sentry.io (Cash App SDK deps)
//   Frames:   portal.sandbox.afterpay.com (Afterpay checkout popup/iframe),
//             placement-api.us-sandbox.afterpay.com (On-Site Messaging iframe)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js-sandbox.squarecdn.com https://portal.sandbox.afterpay.com https://sandbox.kit.cash.app",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://sandbox.kit.cash.app",
  "font-src 'self' https://cdn.fontshare.com https://cash-f.squarecdn.com",
  "img-src 'self' data: blob: https://static.afterpaycdn.com https://static.afterpay.com https://site-assets.afterpay.com https://images.unsplash.com https://sandbox.api.cash.app https://franklin-assets.s3.amazonaws.com",
  "connect-src 'self' https://portal.sandbox.afterpay.com https://*.us-sandbox.afterpay.com https://global-api-sandbox.afterpay.com https://sandbox.kit.cash.app https://api.lab.amplitude.com https://*.ingest.sentry.io",
  "frame-src 'self' https://portal.sandbox.afterpay.com https://placement-api.us-sandbox.afterpay.com https://sandbox.kit.cash.app",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
