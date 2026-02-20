import { STORAGE_KEYS, LOCAL_STORAGE_KEYS } from '@/lib/storage-keys';

describe('STORAGE_KEYS', () => {
  it('defines PENDING_ORDER key', () => {
    expect(STORAGE_KEYS.PENDING_ORDER).toBe('afterpay_pending_order');
  });

  it('defines CHECKOUT_CART key', () => {
    expect(STORAGE_KEYS.CHECKOUT_CART).toBe('afterpay_checkout_cart');
  });

  it('has exactly 2 keys', () => {
    expect(Object.keys(STORAGE_KEYS).length).toBe(2);
  });
});

describe('LOCAL_STORAGE_KEYS', () => {
  it('defines DEV_PANEL_HEIGHT key', () => {
    expect(LOCAL_STORAGE_KEYS.DEV_PANEL_HEIGHT).toBe('devPanelHeight');
  });

  it('has exactly 1 key', () => {
    expect(Object.keys(LOCAL_STORAGE_KEYS).length).toBe(1);
  });
});
