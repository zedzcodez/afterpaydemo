import {
  SHIPPING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  getAfterpayShippingOptions,
} from '@/lib/shipping';

describe('SHIPPING_OPTIONS', () => {
  it('exports an array of shipping options', () => {
    expect(Array.isArray(SHIPPING_OPTIONS)).toBe(true);
    expect(SHIPPING_OPTIONS.length).toBe(3);
  });

  it('each option has required fields', () => {
    SHIPPING_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('name');
      expect(opt).toHaveProperty('description');
      expect(opt).toHaveProperty('price');
      expect(typeof opt.price).toBe('number');
      expect(opt.price).toBeGreaterThan(0);
    });
  });

  it('has unique IDs', () => {
    const ids = SHIPPING_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes standard, express, and overnight', () => {
    const ids = SHIPPING_OPTIONS.map((o) => o.id);
    expect(ids).toContain('standard');
    expect(ids).toContain('express');
    expect(ids).toContain('overnight');
  });
});

describe('FREE_SHIPPING_THRESHOLD', () => {
  it('is a positive number', () => {
    expect(typeof FREE_SHIPPING_THRESHOLD).toBe('number');
    expect(FREE_SHIPPING_THRESHOLD).toBeGreaterThan(0);
  });
});

describe('getAfterpayShippingOptions', () => {
  it('returns Afterpay API formatted options', () => {
    const options = getAfterpayShippingOptions(50);

    options.forEach((opt) => {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('name');
      expect(opt).toHaveProperty('description');
      expect(opt).toHaveProperty('shippingAmount');
      expect(opt).toHaveProperty('taxAmount');
      expect(opt).toHaveProperty('orderAmount');
      expect(opt.shippingAmount).toHaveProperty('amount');
      expect(opt.shippingAmount).toHaveProperty('currency');
      expect(opt.shippingAmount.currency).toBe('USD');
      expect(opt.orderAmount.currency).toBe('USD');
    });
  });

  it('returns same number of options as SHIPPING_OPTIONS', () => {
    const options = getAfterpayShippingOptions(50);
    expect(options.length).toBe(SHIPPING_OPTIONS.length);
  });

  it('includes shipping cost in order amount when below threshold', () => {
    const cartTotal = 50;
    const options = getAfterpayShippingOptions(cartTotal);
    const standard = options.find((o) => o.id === 'standard')!;
    const standardPrice = SHIPPING_OPTIONS.find((o) => o.id === 'standard')!.price;

    expect(parseFloat(standard.shippingAmount.amount)).toBe(standardPrice);
    expect(parseFloat(standard.orderAmount.amount)).toBe(cartTotal + standardPrice);
  });

  it('applies free standard shipping at threshold', () => {
    const cartTotal = FREE_SHIPPING_THRESHOLD;
    const options = getAfterpayShippingOptions(cartTotal);
    const standard = options.find((o) => o.id === 'standard')!;

    expect(standard.name).toContain('Free');
    expect(standard.shippingAmount.amount).toBe('0.00');
    expect(parseFloat(standard.orderAmount.amount)).toBe(cartTotal);
  });

  it('applies free standard shipping above threshold', () => {
    const cartTotal = FREE_SHIPPING_THRESHOLD + 50;
    const options = getAfterpayShippingOptions(cartTotal);
    const standard = options.find((o) => o.id === 'standard')!;

    expect(standard.name).toContain('Free');
    expect(standard.shippingAmount.amount).toBe('0.00');
  });

  it('does not apply free shipping to non-standard options', () => {
    const cartTotal = FREE_SHIPPING_THRESHOLD + 50;
    const options = getAfterpayShippingOptions(cartTotal);
    const express = options.find((o) => o.id === 'express')!;
    const overnight = options.find((o) => o.id === 'overnight')!;

    expect(parseFloat(express.shippingAmount.amount)).toBeGreaterThan(0);
    expect(parseFloat(overnight.shippingAmount.amount)).toBeGreaterThan(0);
  });

  it('sets tax amount to zero', () => {
    const options = getAfterpayShippingOptions(50);
    options.forEach((opt) => {
      expect(opt.taxAmount.amount).toBe('0.00');
    });
  });

  it('formats amounts to two decimal places', () => {
    const options = getAfterpayShippingOptions(99.99);
    options.forEach((opt) => {
      expect(opt.shippingAmount.amount).toMatch(/^\d+\.\d{2}$/);
      expect(opt.orderAmount.amount).toMatch(/^\d+\.\d{2}$/);
    });
  });
});
