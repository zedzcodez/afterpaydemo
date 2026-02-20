import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/components/CartProvider';
import type { Product } from '@/lib/types';

// Mock localStorage
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    mockStorage[key] = value;
  });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
    delete mockStorage[key];
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const testProduct: Product = {
  id: '1',
  name: 'Test Product',
  description: 'A test product',
  price: 25.00,
  currency: 'USD',
  image: 'https://example.com/image.jpg',
  sku: 'TEST-001',
  category: 'Test',
};

const secondProduct: Product = {
  id: '2',
  name: 'Second Product',
  description: 'Another test product',
  price: 15.50,
  currency: 'USD',
  image: 'https://example.com/image2.jpg',
  sku: 'TEST-002',
  category: 'Test',
};

// Test component that exposes cart context for assertions
function CartConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useCart>) => void }) {
  const cart = useCart();
  onRender(cart);
  return (
    <div>
      <span data-testid="item-count">{cart.itemCount}</span>
      <span data-testid="total">{cart.total}</span>
    </div>
  );
}

describe('CartProvider', () => {
  it('provides default empty cart', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );
    expect(cartCtx!.items).toEqual([]);
    expect(cartCtx!.total).toBe(0);
    expect(cartCtx!.itemCount).toBe(0);
  });

  it('adds items to cart', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
    });

    expect(cartCtx!.items.length).toBe(1);
    expect(cartCtx!.items[0].product.id).toBe('1');
    expect(cartCtx!.items[0].quantity).toBe(1);
  });

  it('increments quantity when adding the same item', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
    });
    act(() => {
      cartCtx!.addToCart(testProduct);
    });

    expect(cartCtx!.items.length).toBe(1);
    expect(cartCtx!.items[0].quantity).toBe(2);
  });

  it('removes items from cart', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
      cartCtx!.addToCart(secondProduct);
    });
    act(() => {
      cartCtx!.removeFromCart('1');
    });

    expect(cartCtx!.items.length).toBe(1);
    expect(cartCtx!.items[0].product.id).toBe('2');
  });

  it('updates item quantity', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
    });
    act(() => {
      cartCtx!.updateQuantity('1', 5);
    });

    expect(cartCtx!.items[0].quantity).toBe(5);
  });

  it('removes item when quantity is set to zero', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
    });
    act(() => {
      cartCtx!.updateQuantity('1', 0);
    });

    expect(cartCtx!.items.length).toBe(0);
  });

  it('clears cart', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
      cartCtx!.addToCart(secondProduct);
    });
    act(() => {
      cartCtx!.clearCart();
    });

    expect(cartCtx!.items).toEqual([]);
    expect(cartCtx!.total).toBe(0);
    expect(cartCtx!.itemCount).toBe(0);
  });

  it('calculates total correctly', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct); // 25.00
      cartCtx!.addToCart(secondProduct); // 15.50
    });

    expect(cartCtx!.total).toBe(40.50);
  });

  it('calculates item count correctly with multiple quantities', () => {
    let cartCtx: ReturnType<typeof useCart> | undefined;
    render(
      <CartProvider>
        <CartConsumer onRender={(ctx) => { cartCtx = ctx; }} />
      </CartProvider>
    );

    act(() => {
      cartCtx!.addToCart(testProduct);
    });
    act(() => {
      cartCtx!.updateQuantity('1', 3);
    });
    act(() => {
      cartCtx!.addToCart(secondProduct);
    });

    // 3 + 1 = 4
    expect(cartCtx!.itemCount).toBe(4);
  });

  it('throws when useCart is used outside CartProvider', () => {
    // Suppress console.error for expected error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    function Orphan() {
      useCart();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      'useCart must be used within a CartProvider'
    );
  });
});
