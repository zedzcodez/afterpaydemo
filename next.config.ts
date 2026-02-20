import type { NextConfig } from "next";

// Content-Security-Policy directives for the app.
// External resources loaded at runtime:
//   Scripts:  js-sandbox.squarecdn.com (Square/Cash App SDK), portal.sandbox.afterpay.com (Afterpay.js)
//   Styles:   api.fontshare.com (Fontshare CSS)
//   Fonts:    cdn.fontshare.com (Fontshare font files)
//   Images:   static.afterpaycdn.com, static.afterpay.com (logos/icons), images.unsplash.com (product images)
//   Connect:  portal.sandbox.afterpay.com, portalapi.us-sandbox.afterpay.com (SDK API calls)
//   Frames:   portal.sandbox.afterpay.com (Afterpay checkout popup/iframe)
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js-sandbox.squarecdn.com https://portal.sandbox.afterpay.com",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "font-src 'self' https://cdn.fontshare.com",
  "img-src 'self' data: blob: https://static.afterpaycdn.com https://static.afterpay.com https://images.unsplash.com",
  "connect-src 'self' https://portal.sandbox.afterpay.com https://portalapi.us-sandbox.afterpay.com https://global-api-sandbox.afterpay.com",
  "frame-src 'self' https://portal.sandbox.afterpay.com",
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
