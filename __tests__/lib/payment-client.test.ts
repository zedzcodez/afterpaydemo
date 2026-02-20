import { captureFullPaymentClient, authorizePaymentClient } from '@/lib/payment-client';

// Mock addFlowLog to prevent sessionStorage dependency
jest.mock('@/lib/flowLogs', () => ({
  addFlowLog: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('captureFullPaymentClient', () => {
  const mockSuccessResponse = {
    id: 'order-123',
    status: 'APPROVED',
    originalAmount: { amount: '50.00', currency: 'USD' },
  };

  it('calls capture-full endpoint with token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    const result = await captureFullPaymentClient('test-token');

    expect(mockFetch).toHaveBeenCalledWith('/api/afterpay/capture-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test-token' }),
    });
    expect(result.orderId).toBe('order-123');
    expect(result.data).toEqual(mockSuccessResponse);
  });

  it('includes optional amount in request', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    await captureFullPaymentClient('test-token', { amount: 55.99 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amount).toBe(55.99);
  });

  it('includes checkout adjustment options', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    await captureFullPaymentClient('test-token', {
      amount: 60,
      isCheckoutAdjusted: true,
      paymentScheduleChecksum: 'abc123',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amount).toBe(60);
    expect(body.isCheckoutAdjusted).toBe(true);
    expect(body.paymentScheduleChecksum).toBe('abc123');
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: 'Invalid token' }),
      status: 400,
    });

    await expect(captureFullPaymentClient('bad-token')).rejects.toThrow('Invalid token');
  });

  it('throws when payment status is not APPROVED', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'order-456', status: 'DECLINED' }),
      status: 200,
    });

    await expect(captureFullPaymentClient('test-token')).rejects.toThrow('Payment was not approved');
  });

  it('does not include amount when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    await captureFullPaymentClient('test-token');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ token: 'test-token' });
    expect(body.amount).toBeUndefined();
  });
});

describe('authorizePaymentClient', () => {
  const mockSuccessResponse = {
    id: 'order-789',
    status: 'APPROVED',
    originalAmount: { amount: '100.00', currency: 'USD' },
    openToCapture: { amount: '100.00', currency: 'USD' },
  };

  it('calls auth endpoint with token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    const result = await authorizePaymentClient('auth-token');

    expect(mockFetch).toHaveBeenCalledWith('/api/afterpay/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'auth-token' }),
    });
    expect(result.orderId).toBe('order-789');
  });

  it('includes optional amount and adjustment options', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockSuccessResponse,
      status: 200,
    });

    await authorizePaymentClient('auth-token', {
      amount: 75,
      isCheckoutAdjusted: true,
      paymentScheduleChecksum: 'checksum-xyz',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.token).toBe('auth-token');
    expect(body.amount).toBe(75);
    expect(body.isCheckoutAdjusted).toBe(true);
    expect(body.paymentScheduleChecksum).toBe('checksum-xyz');
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: 'Token expired' }),
      status: 400,
    });

    await expect(authorizePaymentClient('expired-token')).rejects.toThrow('Token expired');
  });

  it('throws when payment status is not APPROVED', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ id: 'order-000', status: 'DECLINED' }),
      status: 200,
    });

    await expect(authorizePaymentClient('test-token')).rejects.toThrow('Payment was not approved');
  });
});
