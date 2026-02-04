import type { Metadata } from "next";
import Script from "next/script";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
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
    <html lang="en" className={`${outfit.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
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
          <CartProvider>
            <Header />
            <main>{children}</main>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
