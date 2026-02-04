import { sanitizeError, errorResponse } from '@/lib/errors';

describe('sanitizeError', () => {
  // Suppress console.error during tests since sanitizeError logs errors
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns safe message for unauthorized error', () => {
    const error = new Error('Unauthorized access');
    expect(sanitizeError(error, 'test')).toBe('Authentication failed');
  });

  it('returns safe message for 401 error', () => {
    const error = new Error('Error 401: Not allowed');
    expect(sanitizeError(error, 'test')).toBe('Authentication failed');
  });

  it('returns safe message for token error', () => {
    const error = new Error('Invalid token provided');
    expect(sanitizeError(error, 'test')).toBe('Invalid or expired token');
  });

  it('returns safe message for invalid_token error', () => {
    const error = new Error('invalid_token: session expired');
    expect(sanitizeError(error, 'test')).toBe('Invalid or expired token');
  });

  it('returns safe message for declined error', () => {
    const error = new Error('Payment declined');
    expect(sanitizeError(error, 'test')).toBe('Payment was declined');
  });

  it('returns safe message for not found error', () => {
    const error = new Error('Order not found');
    expect(sanitizeError(error, 'test')).toBe('Resource not found');
  });

  it('returns safe message for 404 error', () => {
    const error = new Error('Error 404');
    expect(sanitizeError(error, 'test')).toBe('Resource not found');
  });

  it('returns safe message for amount error', () => {
    const error = new Error('Invalid amount specified');
    expect(sanitizeError(error, 'test')).toBe('Invalid amount specified');
  });

  it('returns safe message for already performed error', () => {
    const error = new Error('Refund already processed');
    expect(sanitizeError(error, 'test')).toBe('This action has already been performed');
  });

  it('returns generic message for unknown errors', () => {
    const error = new Error('Some internal server error with stack trace');
    expect(sanitizeError(error, 'test')).toBe('An error occurred. Please try again.');
  });

  it('handles non-Error objects', () => {
    expect(sanitizeError('string error', 'test')).toBe('An error occurred. Please try again.');
    expect(sanitizeError(null, 'test')).toBe('An error occurred. Please try again.');
    expect(sanitizeError(undefined, 'test')).toBe('An error occurred. Please try again.');
    expect(sanitizeError({ message: 'object error' }, 'test')).toBe('An error occurred. Please try again.');
  });

  it('logs error to console', () => {
    const error = new Error('Test error');
    sanitizeError(error, 'test-context');
    expect(console.error).toHaveBeenCalledWith('[test-context] Error:', error);
  });
});

describe('errorResponse', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns error object with safe message and default status', () => {
    const error = new Error('Some error');
    const result = errorResponse(error, 'test');
    expect(result).toEqual({
      error: 'An error occurred. Please try again.',
      status: 500,
    });
  });

  it('returns error object with custom status', () => {
    const error = new Error('Unauthorized');
    const result = errorResponse(error, 'test', 401);
    expect(result).toEqual({
      error: 'Authentication failed',
      status: 401,
    });
  });
});
