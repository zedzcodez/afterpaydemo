import { STORAGE_KEYS, LOCAL_STORAGE_KEYS } from '@/lib/storage-keys';

describe('STORAGE_KEYS', () => {
  it('defines PENDING_ORDER key', () => {
    expect(STORAGE_KEYS.PENDING_ORDER).toBe('afterpay_pending_order');
  });

  it('defines CHECKOUT_CART key', () => {
    expect(STORAGE_KEYS.CHECKOUT_CART).toBe('afterpay_checkout_cart');
  });

  it('defines FLOW_LOGS key', () => {
    expect(STORAGE_KEYS.FLOW_LOGS).toBe('afterpay-flow-logs');
  });

  it('has exactly 3 keys', () => {
    expect(Object.keys(STORAGE_KEYS).length).toBe(3);
  });
});

describe('LOCAL_STORAGE_KEYS', () => {
  it('defines DEV_PANEL_HEIGHT key', () => {
    expect(LOCAL_STORAGE_KEYS.DEV_PANEL_HEIGHT).toBe('devPanelHeight');
  });

  it('defines CART key', () => {
    expect(LOCAL_STORAGE_KEYS.CART).toBe('afterpay-demo-cart');
  });

  it('defines CONFIG key', () => {
    expect(LOCAL_STORAGE_KEYS.CONFIG).toBe('afterpay-demo-config');
  });

  it('defines ORDERS key', () => {
    expect(LOCAL_STORAGE_KEYS.ORDERS).toBe('afterpay-demo-orders');
  });

  it('defines THEME key', () => {
    expect(LOCAL_STORAGE_KEYS.THEME).toBe('theme');
  });

  it('has exactly 5 keys', () => {
    expect(Object.keys(LOCAL_STORAGE_KEYS).length).toBe(5);
  });
});
