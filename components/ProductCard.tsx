"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import { formatPrice, calculateInstallment } from "@/lib/products";
import { OSMPlacement } from "./OSMPlacement";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-lg overflow-hidden border border-afterpay-gray-200 hover:shadow-lg transition-shadow"
    >
      {/* Product Image */}
      <div className="aspect-square bg-afterpay-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-afterpay-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16"
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
      </div>

      {/* Product Info */}
      <div className="p-4">
        <p className="text-sm text-afterpay-gray-500 mb-1">{product.category}</p>
        <h3 className="font-medium text-afterpay-black group-hover:text-afterpay-gray-700 transition-colors">
          {product.name}
        </h3>
        <p className="mt-2 text-lg font-semibold">
          {formatPrice(product.price, product.currency)}
        </p>

        {/* Afterpay OSM Badge */}
        <div className="mt-2">
          <OSMPlacement
            pageType="product"
            amount={product.price}
            currency={product.currency}
            itemSkus={product.sku}
            itemCategories={product.category}
          />
        </div>
      </div>
    </Link>
  );
}
