import { Product } from "./types";

export const products: Product[] = [
  {
    id: "1",
    name: "Classic Cotton T-Shirt",
    description:
      "A comfortable everyday essential made from 100% organic cotton. Perfect for casual wear.",
    price: 35.0,
    currency: "USD",
    image: "/images/product-1.jpg",
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
    image: "/images/product-2.jpg",
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
    image: "/images/product-3.jpg",
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
    image: "/images/product-4.jpg",
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
    image: "/images/product-5.jpg",
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
    image: "/images/product-6.jpg",
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
    image: "/images/product-7.jpg",
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
    image: "/images/product-8.jpg",
    sku: "TRACKER-001",
    category: "Electronics",
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
