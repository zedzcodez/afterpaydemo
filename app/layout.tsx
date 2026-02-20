import type { Metadata } from "next";
import Script from "next/script";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afterpay Demo Shop",
  description: "Merchant checkout integration demo for Afterpay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to Fontshare CDN for faster font loading */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        {/* Fontshare CDN — Clash Display + General Sans */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        {/* Afterpay On-Site Messaging SDK */}
        <Script
          src="https://js-sandbox.squarecdn.com/square-marketplace.js"
          strategy="afterInteractive"
        />
        {/* Afterpay.js for Express Checkout */}
        <Script
          src="https://portal.sandbox.afterpay.com/afterpay.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-white dark:bg-afterpay-gray-900 text-afterpay-black dark:text-white min-h-screen font-body transition-colors duration-200">
        <ThemeProvider>
          <ConfigProvider>
            <CartProvider>
              <Header />
              <main>{children}</main>
              <ScrollToTop />
            </CartProvider>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
