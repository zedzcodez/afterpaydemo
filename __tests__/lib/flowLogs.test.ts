import {
  initFlowLogs,
  addFlowLog,
  getFlowLogs,
  clearFlowLogs,
  setFlowSummary,
  updateFlowSummary,
  logApiCall,
  logCallback,
  logRedirect,
  formatFlowName,
  FLOW_SUMMARIES,
} from '@/lib/flowLogs';

// Mock sessionStorage
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

describe('initFlowLogs', () => {
  it('creates initial flow log structure', () => {
    initFlowLogs('standard');
    const logs = getFlowLogs();
    expect(logs).not.toBeNull();
    expect(logs!.flow).toBe('standard');
    expect(logs!.entries).toEqual([]);
    expect(logs!.startTime).toBeDefined();
  });

  it('overwrites previous logs', () => {
    initFlowLogs('standard');
    addFlowLog({ type: 'callback', label: 'test' });
    initFlowLogs('cashapp');
    const logs = getFlowLogs();
    expect(logs!.flow).toBe('cashapp');
    expect(logs!.entries).toEqual([]);
  });
});

describe('addFlowLog', () => {
  beforeEach(() => {
    initFlowLogs('test');
  });

  it('adds an entry with auto-generated id and timestamp', () => {
    addFlowLog({ type: 'callback', label: 'Test callback' });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(1);
    expect(logs.entries[0].id).toBeDefined();
    expect(logs.entries[0].timestamp).toBeDefined();
    expect(logs.entries[0].type).toBe('callback');
    expect(logs.entries[0].label).toBe('Test callback');
  });

  it('adds multiple entries in order', () => {
    addFlowLog({ type: 'api_request', label: 'Request', method: 'POST', endpoint: '/test' });
    addFlowLog({ type: 'api_response', label: 'Response', method: 'POST', endpoint: '/test', status: 200 });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(2);
    expect(logs.entries[0].type).toBe('api_request');
    expect(logs.entries[1].type).toBe('api_response');
  });

  it('does nothing when no flow logs are initialized', () => {
    clearFlowLogs();
    addFlowLog({ type: 'callback', label: 'Orphan' });
    expect(getFlowLogs()).toBeNull();
  });

  it('deduplicates identical entries within time window', () => {
    addFlowLog({ type: 'callback', label: 'Duplicate', data: { key: 'value' } });
    addFlowLog({ type: 'callback', label: 'Duplicate', data: { key: 'value' } });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(1);
  });

  it('allows entries with different labels', () => {
    addFlowLog({ type: 'callback', label: 'First' });
    addFlowLog({ type: 'callback', label: 'Second' });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(2);
  });

  it('allows entries with different types', () => {
    addFlowLog({ type: 'callback', label: 'Test' });
    addFlowLog({ type: 'redirect', label: 'Test' });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(2);
  });
});

describe('clearFlowLogs', () => {
  it('removes flow logs from storage', () => {
    initFlowLogs('test');
    clearFlowLogs();
    expect(getFlowLogs()).toBeNull();
  });
});

describe('setFlowSummary', () => {
  beforeEach(() => {
    initFlowLogs('test');
  });

  it('sets the flow summary', () => {
    const summary = {
      flow: 'test',
      description: 'Test flow',
      steps: ['Step 1', 'Step 2'],
      docsUrl: 'https://example.com',
      requestConfig: {},
      responseData: {},
    };
    setFlowSummary(summary);
    const logs = getFlowLogs()!;
    expect(logs.summary).toEqual(summary);
  });

  it('does nothing when no logs initialized', () => {
    clearFlowLogs();
    setFlowSummary({
      flow: 'test',
      description: '',
      steps: [],
      docsUrl: '',
      requestConfig: {},
      responseData: {},
    });
    expect(getFlowLogs()).toBeNull();
  });
});

describe('updateFlowSummary', () => {
  beforeEach(() => {
    initFlowLogs('test');
    setFlowSummary({
      flow: 'test',
      description: 'Original',
      steps: ['Step 1'],
      docsUrl: 'https://example.com',
      requestConfig: { key: 'original' },
      responseData: {},
    });
  });

  it('merges updates into existing summary', () => {
    updateFlowSummary({ description: 'Updated' });
    const logs = getFlowLogs()!;
    expect(logs.summary!.description).toBe('Updated');
    expect(logs.summary!.flow).toBe('test'); // preserved
  });

  it('merges requestConfig and responseData', () => {
    updateFlowSummary({
      requestConfig: { newKey: 'newValue' },
      responseData: { token: 'abc' },
    });
    const logs = getFlowLogs()!;
    // updateFlowSummary does shallow merge, so requestConfig is replaced
    expect(logs.summary!.requestConfig).toEqual({ newKey: 'newValue' });
    expect(logs.summary!.responseData).toEqual({ token: 'abc' });
  });
});

describe('logApiCall', () => {
  beforeEach(() => {
    initFlowLogs('test');
  });

  it('adds request and response entries', () => {
    logApiCall('POST', '/v2/checkouts', { items: [] }, { token: 'abc' }, 200, 150);
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(2);
    expect(logs.entries[0].type).toBe('api_request');
    expect(logs.entries[0].method).toBe('POST');
    expect(logs.entries[1].type).toBe('api_response');
    expect(logs.entries[1].status).toBe(200);
    expect(logs.entries[1].duration).toBe(150);
  });
});

describe('logCallback', () => {
  beforeEach(() => {
    initFlowLogs('test');
  });

  it('adds a callback entry', () => {
    logCallback('onComplete', { status: 'SUCCESS' });
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(1);
    expect(logs.entries[0].type).toBe('callback');
    expect(logs.entries[0].label).toBe('Afterpay.js: onComplete');
  });

  it('works without data', () => {
    logCallback('onCommenceCheckout');
    const logs = getFlowLogs()!;
    expect(logs.entries[0].data).toBeUndefined();
  });
});

describe('logRedirect', () => {
  beforeEach(() => {
    initFlowLogs('test');
  });

  it('adds a redirect entry', () => {
    logRedirect('/confirmation?orderId=123', 'Redirect to Confirmation');
    const logs = getFlowLogs()!;
    expect(logs.entries.length).toBe(1);
    expect(logs.entries[0].type).toBe('redirect');
    expect(logs.entries[0].endpoint).toBe('/confirmation?orderId=123');
    expect(logs.entries[0].label).toBe('Redirect to Confirmation');
  });
});

describe('FLOW_SUMMARIES', () => {
  it('defines all expected flow types', () => {
    const expectedFlows = [
      'standard',
      'standard-popup',
      'express-integrated',
      'express-deferred',
      'buynow-integrated',
      'buynow-deferred',
      'cashapp',
    ];
    expectedFlows.forEach((flow) => {
      expect(FLOW_SUMMARIES[flow]).toBeDefined();
    });
  });

  it('each summary has required fields', () => {
    Object.values(FLOW_SUMMARIES).forEach((summary) => {
      expect(summary).toHaveProperty('flow');
      expect(summary).toHaveProperty('description');
      expect(summary).toHaveProperty('steps');
      expect(summary).toHaveProperty('docsUrl');
      expect(Array.isArray(summary.steps)).toBe(true);
      expect(summary.steps.length).toBeGreaterThan(0);
      expect(summary.docsUrl).toMatch(/^https:\/\//);
    });
  });
});

describe('formatFlowName', () => {
  it('formats standard redirect flow', () => {
    expect(formatFlowName('standard-redirect-deferred')).toBe('Standard Checkout via Redirect (Deferred Capture)');
  });

  it('formats standard popup flow', () => {
    expect(formatFlowName('standard-popup-immediate')).toBe('Standard Checkout via Popup (Immediate Capture)');
  });

  it('formats express integrated flow', () => {
    expect(formatFlowName('express-integrated-deferred')).toBe('Express Checkout with Integrated Shipping (Deferred Capture)');
  });

  it('formats express deferred flow', () => {
    expect(formatFlowName('express-deferred-immediate')).toBe('Express Checkout with Deferred Shipping (Immediate Capture)');
  });

  it('formats cash app pay flow', () => {
    expect(formatFlowName('cashapp-deferred')).toBe('Cash App Pay (Deferred Capture)');
  });

  it('formats cash app pay immediate', () => {
    expect(formatFlowName('cashapp-immediate')).toBe('Cash App Pay (Immediate Capture)');
  });

  it('returns "Unknown Flow" for empty string', () => {
    expect(formatFlowName('')).toBe('Unknown Flow');
  });

  it('falls back to Standard Checkout for unrecognized flow', () => {
    // Single unrecognized segment defaults to "Standard Checkout"
    expect(formatFlowName('unknown')).toBe('Standard Checkout');
  });
});
