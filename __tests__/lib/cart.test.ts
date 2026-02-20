import { roundCurrency, calculateTotal } from "@/lib/cart";

describe("roundCurrency", () => {
  it("rounds 35.00 + 5.99 correctly", () => {
    // 35.00 + 5.99 can produce 40.989999999999995 in floating-point
    expect(roundCurrency(35.0 + 5.99)).toBe(40.99);
  });

  it("rounds 0.1 + 0.2 correctly", () => {
    // Classic floating-point problem: 0.1 + 0.2 = 0.30000000000000004
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds 99.99 + 12.99 correctly", () => {
    expect(roundCurrency(99.99 + 12.99)).toBe(112.98);
  });

  it("returns exact value when already clean", () => {
    expect(roundCurrency(10.5)).toBe(10.5);
    expect(roundCurrency(100)).toBe(100);
    expect(roundCurrency(0)).toBe(0);
  });

  it("rounds to two decimal places", () => {
    // Note: 1.005 is not exactly representable in IEEE 754 (it's actually
    // 1.00499...) so Math.round correctly rounds it down to 1.00.
    expect(roundCurrency(1.005)).toBe(1.0);
    expect(roundCurrency(1.004)).toBe(1.0);
    expect(roundCurrency(99.999)).toBe(100.0);
  });

  it("handles negative amounts", () => {
    expect(roundCurrency(-5.555)).toBe(-5.55);
    expect(roundCurrency(-0.1 - 0.2)).toBe(-0.3);
  });
});

describe("calculateTotal", () => {
  it("returns 0 for empty cart", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("returns rounded total for items with floating-point prices", () => {
    const items = [
      { product: { id: "1", name: "A", description: "", price: 35.0, currency: "USD", image: "", sku: "A1", category: "test" }, quantity: 1 },
      { product: { id: "2", name: "B", description: "", price: 5.99, currency: "USD", image: "", sku: "B1", category: "test" }, quantity: 1 },
    ];
    expect(calculateTotal(items)).toBe(40.99);
  });
});
