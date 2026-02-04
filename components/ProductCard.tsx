"use client";

import Link from "next/link";
import Image from "next/image";
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
      className="group block bg-white dark:bg-afterpay-gray-800 rounded-xl overflow-hidden shadow-soft hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 border border-afterpay-gray-100 dark:border-afterpay-gray-700"
    >
      {/* Product Image */}
      <div className="aspect-square bg-afterpay-gray-50 dark:bg-afterpay-gray-900 relative overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-afterpay-mint/0 group-hover:bg-afterpay-mint/10 transition-colors duration-300" />
      </div>

      {/* Product Info */}
      <div className="p-5">
        <p className="text-xs font-medium text-afterpay-gray-400 uppercase tracking-wider mb-1">
          {product.category}
        </p>
        <h3 className="font-display font-semibold text-afterpay-black dark:text-white group-hover:text-afterpay-gray-700 dark:group-hover:text-afterpay-gray-300 transition-colors text-lg">
          {product.name}
        </h3>
        <p className="mt-3 text-2xl font-bold font-display dark:text-white">
          {formatPrice(product.price, product.currency)}
        </p>

        {/* Afterpay OSM Badge */}
        <div className="mt-3 pt-3 border-t border-afterpay-gray-100 dark:border-afterpay-gray-700">
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
