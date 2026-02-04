import { products, formatPrice, getProduct, calculateInstallment } from '@/lib/products';

describe('products', () => {
  it('exports array of products', () => {
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it('each product has required fields', () => {
    products.forEach((product) => {
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('currency');
      expect(product).toHaveProperty('image');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('category');
      expect(typeof product.price).toBe('number');
      expect(product.price).toBeGreaterThan(0);
    });
  });

  it('has unique product ids', () => {
    const ids = products.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has unique SKUs', () => {
    const skus = products.map((p) => p.sku);
    const uniqueSkus = new Set(skus);
    expect(uniqueSkus.size).toBe(skus.length);
  });
});

describe('formatPrice', () => {
  it('formats price with dollar sign', () => {
    expect(formatPrice(100)).toBe('$100.00');
  });

  it('formats decimal prices', () => {
    expect(formatPrice(99.99)).toBe('$99.99');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats large numbers with comma separator', () => {
    expect(formatPrice(1000)).toBe('$1,000.00');
    expect(formatPrice(1000000)).toBe('$1,000,000.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatPrice(99.999)).toBe('$100.00');
    expect(formatPrice(99.994)).toBe('$99.99');
  });

  it('formats with custom currency', () => {
    expect(formatPrice(100, 'EUR')).toBe('€100.00');
    expect(formatPrice(100, 'GBP')).toBe('£100.00');
  });
});

describe('getProduct', () => {
  it('returns product by id', () => {
    const product = getProduct('1');
    expect(product).toBeDefined();
    expect(product?.id).toBe('1');
  });

  it('returns correct product data', () => {
    const product = getProduct('1');
    expect(product?.name).toBe('Classic Cotton T-Shirt');
    expect(product?.price).toBe(35.0);
  });

  it('returns undefined for invalid id', () => {
    const product = getProduct('invalid-id');
    expect(product).toBeUndefined();
  });

  it('returns undefined for empty id', () => {
    const product = getProduct('');
    expect(product).toBeUndefined();
  });

  it('can find all products by their id', () => {
    products.forEach((product) => {
      const found = getProduct(product.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(product.id);
    });
  });
});

describe('calculateInstallment', () => {
  it('divides price by 4 and formats', () => {
    expect(calculateInstallment(100)).toBe('$25.00');
  });

  it('handles uneven divisions', () => {
    // 35 / 4 = 8.75
    expect(calculateInstallment(35)).toBe('$8.75');
  });

  it('handles small amounts', () => {
    // 1 / 4 = 0.25
    expect(calculateInstallment(1)).toBe('$0.25');
  });

  it('handles zero', () => {
    expect(calculateInstallment(0)).toBe('$0.00');
  });
});
