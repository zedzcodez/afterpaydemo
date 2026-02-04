import { ProductGrid } from "@/components/ProductGrid";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-afterpay-black mb-4">
          Welcome to Afterpay Demo Shop
        </h1>
        <p className="text-lg text-afterpay-gray-600 max-w-2xl mx-auto">
          Experience seamless checkout with Afterpay. Buy now, pay later in 4
          interest-free payments.
        </p>
        <div className="mt-6 inline-flex items-center px-4 py-2 bg-afterpay-mint rounded-full">
          <span className="text-sm font-medium text-afterpay-black">
            Powered by Afterpay
          </span>
        </div>
      </div>

      {/* Product Grid */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Shop All Products</h2>
        <ProductGrid products={products} />
      </section>

      {/* Integration Info */}
      <section className="mt-16 bg-afterpay-gray-50 rounded-lg p-8">
        <h2 className="text-xl font-semibold mb-4">About This Demo</h2>
        <p className="text-afterpay-gray-600 mb-4">
          This demo showcases Afterpay&apos;s merchant integration capabilities:
        </p>
        <ul className="space-y-2 text-afterpay-gray-600">
          <li className="flex items-start">
            <span className="w-6 h-6 bg-afterpay-mint rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <span className="text-xs font-bold">1</span>
            </span>
            <span>
              <strong>On-Site Messaging</strong> - Payment breakdown badges on
              product and cart pages
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-6 h-6 bg-afterpay-mint rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <span className="text-xs font-bold">2</span>
            </span>
            <span>
              <strong>Express Checkout</strong> - Afterpay.js popup with
              integrated and deferred shipping
            </span>
          </li>
          <li className="flex items-start">
            <span className="w-6 h-6 bg-afterpay-mint rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <span className="text-xs font-bold">3</span>
            </span>
            <span>
              <strong>Standard Checkout</strong> - Server-side API with Auth +
              Capture flow
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
