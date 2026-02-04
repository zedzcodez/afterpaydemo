import { Product } from "./types";

export const products: Product[] = [
  {
    id: "1",
    name: "Classic Cotton T-Shirt",
    description:
      "A comfortable everyday essential made from 100% organic cotton. Perfect for casual wear.",
    price: 35.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop",
    sku: "TSHIRT-001",
    category: "Clothing",
  },
  {
    id: "2",
    name: "Premium Denim Jeans",
    description:
      "High-quality denim with a modern fit. Features stretch fabric for all-day comfort.",
    price: 89.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop",
    sku: "JEANS-001",
    category: "Clothing",
  },
  {
    id: "3",
    name: "Leather Crossbody Bag",
    description:
      "Elegant genuine leather bag with adjustable strap. Perfect for everyday essentials.",
    price: 149.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=600&fit=crop",
    sku: "BAG-001",
    category: "Accessories",
  },
  {
    id: "4",
    name: "Wireless Earbuds Pro",
    description:
      "Premium sound quality with active noise cancellation. 24-hour battery life.",
    price: 199.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
    sku: "AUDIO-001",
    category: "Electronics",
  },
  {
    id: "5",
    name: "Minimalist Watch",
    description:
      "Sleek stainless steel design with sapphire crystal glass. Water resistant to 50m.",
    price: 275.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    sku: "WATCH-001",
    category: "Accessories",
  },
  {
    id: "6",
    name: "Running Sneakers",
    description:
      "Lightweight performance shoes with responsive cushioning. Breathable mesh upper.",
    price: 129.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
    sku: "SHOES-001",
    category: "Footwear",
  },
  {
    id: "7",
    name: "Cashmere Sweater",
    description:
      "Luxuriously soft 100% cashmere. Classic crew neck design for timeless style.",
    price: 295.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop",
    sku: "SWEATER-001",
    category: "Clothing",
  },
  {
    id: "8",
    name: "Smart Fitness Tracker",
    description:
      "Track your health and fitness goals. Heart rate monitoring, GPS, and 7-day battery.",
    price: 349.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&h=600&fit=crop",
    sku: "TRACKER-001",
    category: "Electronics",
  },
  {
    id: "9",
    name: "Designer Leather Jacket",
    description:
      "Premium Italian leather with silk lining. Timeless moto-style design for effortless edge.",
    price: 425.0,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop",
    sku: "JACKET-001",
    category: "Clothing",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

export function calculateInstallment(price: number): string {
  const installment = price / 4;
  return formatPrice(installment);
}
