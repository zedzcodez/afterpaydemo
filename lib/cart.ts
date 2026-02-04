import { CartItem, Product } from "./types";

const CART_STORAGE_KEY = "afterpay-demo-cart";

export function getStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function addToCart(items: CartItem[], product: Product): CartItem[] {
  const existingIndex = items.findIndex(
    (item) => item.product.id === product.id
  );
  if (existingIndex >= 0) {
    const newItems = [...items];
    newItems[existingIndex] = {
      ...newItems[existingIndex],
      quantity: newItems[existingIndex].quantity + 1,
    };
    return newItems;
  }
  return [...items, { product, quantity: 1 }];
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.product.id !== productId);
}

export function updateQuantity(
  items: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return removeFromCart(items, productId);
  }
  return items.map((item) =>
    item.product.id === productId ? { ...item, quantity } : item
  );
}

export function calculateTotal(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
}

export function getItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function getCartSkus(items: CartItem[]): string {
  return items.map((item) => item.product.sku).join(",");
}

export function getCartCategories(items: CartItem[]): string {
  const categories = [...new Set(items.map((item) => item.product.category))];
  return categories.join(",");
}
