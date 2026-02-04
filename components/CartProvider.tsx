"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/lib/types";
import {
  getStoredCart,
  saveCart,
  addToCart as addToCartUtil,
  removeFromCart as removeFromCartUtil,
  updateQuantity as updateQuantityUtil,
  calculateTotal,
  getItemCount,
} from "@/lib/cart";

interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  cartAnimationTrigger: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [cartAnimationTrigger, setCartAnimationTrigger] = useState(0);

  useEffect(() => {
    setItems(getStoredCart());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveCart(items);
    }
  }, [items, mounted]);

  const addToCart = (product: Product) => {
    setItems((prev) => addToCartUtil(prev, product));
    // Trigger cart animation
    setCartAnimationTrigger((prev) => prev + 1);
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => removeFromCartUtil(prev, productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) => updateQuantityUtil(prev, productId, quantity));
  };

  const clearCart = () => {
    setItems([]);
  };

  const value: CartContextType = {
    items,
    total: calculateTotal(items),
    itemCount: getItemCount(items),
    cartAnimationTrigger,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
