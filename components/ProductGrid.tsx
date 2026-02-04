"use client";

import { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-soft animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-afterpay-gray-200" />
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-afterpay-gray-200 rounded w-3/4" />
        {/* Price */}
        <div className="h-6 bg-afterpay-gray-200 rounded w-1/3" />
        {/* OSM placeholder */}
        <div className="h-4 bg-afterpay-gray-100 rounded w-full" />
        {/* Button */}
        <div className="h-10 bg-afterpay-gray-200 rounded-lg w-full" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading = false }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
