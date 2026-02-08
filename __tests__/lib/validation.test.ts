import {
  validateRequest,
  checkoutRequestSchema,
  authRequestSchema,
  refundRequestSchema,
  captureRequestSchema,
  voidRequestSchema,
} from '@/lib/validation';

// Helper to create a valid cart item
const createValidCartItem = (overrides = {}) => ({
  product: {
    id: '1',
    name: 'Test Product',
    description: 'A test product',
    price: 50,
    currency: 'USD',
    image: 'https://example.com/image.jpg',
    sku: 'TEST-001',
    category: 'Test',
  },
  quantity: 1,
  ...overrides,
});

describe('validateRequest', () => {
  describe('checkoutRequestSchema', () => {
    it('validates valid checkout request', () => {
      const validRequest = {
        items: [createValidCartItem()],
        total: 50,
      };
      const result = validateRequest(checkoutRequestSchema, validRequest);
      expect(result.success).toBe(true);
    });

    it('validates checkout request with all optional fields', () => {
      const validRequest = {
        items: [createValidCartItem()],
        total: 50,
        mode: 'express',
        consumer: {
          email: 'test@example.com',
          givenNames: 'John',
          surname: 'Doe',
          phoneNumber: '+1234567890',
        },
        shipping: {
          name: 'John Doe',
          line1: '123 Main St',
          line2: 'Apt 4',
          area1: 'San Francisco',
          area2: 'CA',
          postcode: '94102',
          countryCode: 'US',
        },
      };
      const result = validateRequest(checkoutRequestSchema, validRequest);
      expect(result.success).toBe(true);
    });

    it('rejects empty cart', () => {
      const result = validateRequest(checkoutRequestSchema, { items: [], total: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('at least one item');
      }
    });

    it('rejects total exceeding $2000', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem({ product: { ...createValidCartItem().product, price: 2500 } })],
        total: 2500,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('2,000');
      }
    });

    it('validates email format in consumer', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem()],
        total: 50,
        consumer: { email: 'invalid-email', givenNames: 'John', surname: 'Doe' },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain('email');
      }
    });

    it('rejects negative total', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem()],
        total: -50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid mode', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem()],
        total: 50,
        mode: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity exceeding 99', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem({ quantity: 100 })],
        total: 5000,
      });
      expect(result.success).toBe(false);
    });

    it('accepts isCashAppPay: true and preserves the value', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem()],
        total: 50,
        isCashAppPay: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isCashAppPay).toBe(true);
      }
    });

    it('defaults isCashAppPay to false when not provided', () => {
      const result = validateRequest(checkoutRequestSchema, {
        items: [createValidCartItem()],
        total: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isCashAppPay).toBe(false);
      }
    });
  });

  describe('authRequestSchema', () => {
    it('validates valid auth request', () => {
      const result = validateRequest(authRequestSchema, { token: 'valid-token' });
      expect(result.success).toBe(true);
    });

    it('validates auth request with optional amount', () => {
      const result = validateRequest(authRequestSchema, {
        token: 'valid-token',
        amount: 100,
        isCheckoutAdjusted: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing token', () => {
      const result = validateRequest(authRequestSchema, {});
      expect(result.success).toBe(false);
    });

    it('rejects empty token', () => {
      const result = validateRequest(authRequestSchema, { token: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('refundRequestSchema', () => {
    it('validates valid refund request', () => {
      const result = validateRequest(refundRequestSchema, {
        orderId: '123',
        amount: 50,
      });
      expect(result.success).toBe(true);
    });

    it('validates refund with optional fields', () => {
      const result = validateRequest(refundRequestSchema, {
        orderId: '123',
        amount: 50,
        currency: 'AUD',
        merchantReference: 'REF-123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative amount', () => {
      const result = validateRequest(refundRequestSchema, {
        orderId: '123',
        amount: -50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero amount', () => {
      const result = validateRequest(refundRequestSchema, {
        orderId: '123',
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing orderId', () => {
      const result = validateRequest(refundRequestSchema, {
        amount: 50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid currency length', () => {
      const result = validateRequest(refundRequestSchema, {
        orderId: '123',
        amount: 50,
        currency: 'US', // Should be 3 characters
      });
      expect(result.success).toBe(false);
    });
  });

  describe('captureRequestSchema', () => {
    it('validates valid capture request', () => {
      const result = validateRequest(captureRequestSchema, {
        orderId: '123',
        amount: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing amount', () => {
      const result = validateRequest(captureRequestSchema, {
        orderId: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('voidRequestSchema', () => {
    it('validates valid void request', () => {
      const result = validateRequest(voidRequestSchema, {
        orderId: '123',
        amount: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative amount', () => {
      const result = validateRequest(voidRequestSchema, {
        orderId: '123',
        amount: -100,
      });
      expect(result.success).toBe(false);
    });
  });
});
