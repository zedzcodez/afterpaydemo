// lib/orders.ts

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderId: string; // Afterpay order ID
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'voided';
  total: number;
  items: OrderItem[];
  createdAt: string;
  flow: string; // e.g., 'express-integrated', 'standard-redirect'
  captureMode: 'deferred' | 'immediate';
}

const ORDERS_STORAGE_KEY = 'afterpay-demo-orders';

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  if (typeof window === 'undefined') return;
  const orders = getOrders();
  // Check if order already exists (update it)
  const existingIndex = orders.findIndex(o => o.orderId === order.orderId);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.unshift(order); // Add to beginning
  }
  // Keep only last 20 orders
  const trimmed = orders.slice(0, 20);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(trimmed));
}

export function getOrder(orderId: string): Order | undefined {
  return getOrders().find(o => o.orderId === orderId);
}

export function updateOrderStatus(orderId: string, status: Order['status']): void {
  const orders = getOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    order.status = status;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }
}

export function clearOrders(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDERS_STORAGE_KEY);
}

export function deleteOrder(orderId: string): void {
  if (typeof window === 'undefined') return;
  const orders = getOrders();
  const filtered = orders.filter(o => o.orderId !== orderId);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(filtered));
}

export function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
