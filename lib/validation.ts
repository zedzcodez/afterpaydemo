// lib/validation.ts
import { z } from 'zod';

// Product in cart - matches the Product interface in types.ts
const cartProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  currency: z.string().default('USD'),
  image: z.string(),
  sku: z.string(),
  category: z.string(),
});

// Cart item schema - matches CartItem interface
const cartItemSchema = z.object({
  product: cartProductSchema,
  quantity: z.number().int().positive().max(99),
});

// Consumer schema for checkout
const consumerSchema = z.object({
  email: z.string().email('Invalid email address'),
  givenNames: z.string().min(1, 'First name is required'),
  surname: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
});

// Shipping address schema
const shippingSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  area1: z.string().min(1), // city
  area2: z.string().optional(), // state
  postcode: z.string().min(1),
  countryCode: z.string().length(2),
  phoneNumber: z.string().optional(),
});

// Checkout request schema
export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart must have at least one item'),
  total: z.number().positive().max(2000, 'Order total cannot exceed $2,000'),
  mode: z.enum(['standard', 'express']).optional().default('standard'),
  consumer: consumerSchema.optional(),
  shipping: shippingSchema.optional(),
});

// Auth request schema
export const authRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  amount: z.number().positive().optional(),
  isCheckoutAdjusted: z.boolean().optional(),
  paymentScheduleChecksum: z.string().optional(),
});

// Capture request schema
export const captureRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  isCheckoutAdjusted: z.boolean().optional(),
  paymentScheduleChecksum: z.string().optional(),
});

// Refund request schema
export const refundRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Refund amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  merchantReference: z.string().optional(),
});

// Void request schema
export const voidRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
});

// Capture full request schema (immediate capture)
export const captureFullRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  merchantReference: z.string().optional(),
});

// Type inference helpers
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type AuthRequest = z.infer<typeof authRequestSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type VoidRequest = z.infer<typeof voidRequestSchema>;
export type CaptureFullRequest = z.infer<typeof captureFullRequestSchema>;

// Helper to validate and return result
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Return first error message using Zod's issues array
  const firstIssue = result.error.issues[0];
  const errorMessage = firstIssue
    ? `${firstIssue.path.join('.')}: ${firstIssue.message}`.replace(/^: /, '')
    : 'Validation failed';
  return { success: false, error: errorMessage };
}
