import { ProductGrid } from "@/components/ProductGrid";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section with Mint Gradient */}
      <section className="bg-mint-gradient relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-afterpay-mint/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-afterpay-mint/30 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-afterpay-black mb-6 opacity-0 animate-fade-in-up">
              Shop Now,{" "}
              <span className="relative inline-block">
                Pay Later
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-afterpay-mint/60 -z-10 transform -rotate-1" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-afterpay-gray-600 mb-8 opacity-0 animate-fade-in-up animate-delay-100">
              Experience seamless checkout with Afterpay. Split your purchase into 4
              interest-free payments and get what you love today.
            </p>
            <div className="flex flex-wrap justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-200">
              <a
                href="#products"
                className="btn-primary inline-flex items-center"
              >
                Shop Now
                <svg
                  className="ml-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
              <a href="/checkout" className="btn-outline inline-flex items-center">
                Checkout Demo
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 opacity-0 animate-fade-in-up animate-delay-300">
              <div className="flex items-center space-x-2 text-afterpay-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium">Secure Checkout</span>
              </div>
              <div className="flex items-center space-x-2 text-afterpay-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">0% Interest</span>
              </div>
              <div className="flex items-center space-x-2 text-afterpay-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold">Shop All Products</h2>
          <div className="h-1 flex-1 mx-8 bg-gradient-to-r from-afterpay-mint to-transparent rounded hidden md:block" />
        </div>
        <ProductGrid products={products} />
      </section>

      {/* Integration Info */}
      <section className="bg-afterpay-gray-50 dark:bg-afterpay-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 dark:text-white">
              About This Demo
            </h2>
            <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 max-w-2xl mx-auto">
              This demo showcases Afterpay&apos;s merchant integration capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl p-6 shadow-soft hover-lift border border-transparent dark:border-afterpay-gray-700">
              <div className="w-12 h-12 bg-afterpay-mint rounded-xl flex items-center justify-center mb-4">
                <span className="text-xl font-display font-bold text-afterpay-black">1</span>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 dark:text-white">On-Site Messaging</h3>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm">
                Payment breakdown badges on product and cart pages showing installment amounts
              </p>
            </div>

            <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl p-6 shadow-soft hover-lift border border-transparent dark:border-afterpay-gray-700">
              <div className="w-12 h-12 bg-afterpay-mint rounded-xl flex items-center justify-center mb-4">
                <span className="text-xl font-display font-bold text-afterpay-black">2</span>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 dark:text-white">Express Checkout</h3>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm">
                Afterpay.js popup with integrated and deferred shipping options
              </p>
            </div>

            <div className="bg-white dark:bg-afterpay-gray-800 rounded-xl p-6 shadow-soft hover-lift border border-transparent dark:border-afterpay-gray-700">
              <div className="w-12 h-12 bg-afterpay-mint rounded-xl flex items-center justify-center mb-4">
                <span className="text-xl font-display font-bold text-afterpay-black">3</span>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 dark:text-white">Standard Checkout</h3>
              <p className="text-afterpay-gray-600 dark:text-afterpay-gray-400 text-sm">
                Server-side API with Auth + Capture flow for full control
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
