"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProduct, formatPrice, products } from "@/lib/products";
import { useCart } from "@/components/CartProvider";
import { OSMPlacement } from "@/components/OSMPlacement";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const product = getProduct(params.id as string);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link href="/" className="text-afterpay-mint hover:underline">
          Return to Shop
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
  };

  const handleBuyNow = () => {
    addToCart(product);
    router.push("/cart");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-afterpay-gray-500">
          <li>
            <Link href="/" className="hover:text-afterpay-black">
              Shop
            </Link>
          </li>
          <li>/</li>
          <li className="text-afterpay-black">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="aspect-square bg-afterpay-gray-100 rounded-lg flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-32 w-32 text-afterpay-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Product Info */}
        <div>
          <p className="text-sm text-afterpay-gray-500 mb-2">
            {product.category}
          </p>
          <h1 className="text-3xl font-bold text-afterpay-black mb-4">
            {product.name}
          </h1>
          <p className="text-afterpay-gray-600 mb-6">{product.description}</p>

          {/* Price */}
          <div className="mb-4">
            <p className="text-3xl font-bold text-afterpay-black">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>

          {/* Afterpay OSM - Below Price */}
          <div className="mb-8 p-4 bg-afterpay-gray-50 rounded-lg">
            <OSMPlacement
              pageType="product"
              amount={product.price}
              currency={product.currency}
              itemSkus={product.sku}
              itemCategories={product.category}
            />
          </div>

          {/* SKU */}
          <p className="text-sm text-afterpay-gray-500 mb-6">
            SKU: {product.sku}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleBuyNow}
              className="w-full py-3 px-6 bg-afterpay-black text-white font-medium rounded-lg hover:bg-afterpay-gray-800 transition-colors"
            >
              Buy Now
            </button>
            <button
              onClick={handleAddToCart}
              className="w-full py-3 px-6 bg-white text-afterpay-black font-medium rounded-lg border-2 border-afterpay-black hover:bg-afterpay-gray-50 transition-colors"
            >
              Add to Cart
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 pt-8 border-t border-afterpay-gray-200">
            <h3 className="font-medium mb-4">Why shop with Afterpay?</h3>
            <ul className="space-y-3 text-sm text-afterpay-gray-600">
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-afterpay-mint mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                4 interest-free payments
              </li>
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-afterpay-mint mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                No credit check required
              </li>
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-afterpay-mint mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Instant approval at checkout
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
