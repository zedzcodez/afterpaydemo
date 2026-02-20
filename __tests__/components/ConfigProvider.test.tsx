import React from 'react';
import { render, act } from '@testing-library/react';
import { ConfigProvider, useConfig } from '@/components/ConfigProvider';
import { DEFAULT_CONFIG } from '@/lib/config';

// Mock localStorage
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

// Test component that exposes config context for assertions
function ConfigConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useConfig>) => void }) {
  const config = useConfig();
  onRender(config);
  return null;
}

describe('ConfigProvider', () => {
  it('provides default config values', () => {
    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    expect(configCtx!.config).toEqual(DEFAULT_CONFIG);
  });

  it('updates config with partial updates', () => {
    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    act(() => {
      configCtx!.updateConfig({ captureMode: 'immediate' });
    });

    expect(configCtx!.config.captureMode).toBe('immediate');
    // Other fields should remain at defaults
    expect(configCtx!.config.developerMode).toBe(DEFAULT_CONFIG.developerMode);
    expect(configCtx!.config.expressCheckout).toEqual(DEFAULT_CONFIG.expressCheckout);
  });

  it('deep merges nested config updates', () => {
    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    act(() => {
      configCtx!.updateConfig({
        expressCheckout: { type: 'deferred' },
      });
    });

    expect(configCtx!.config.expressCheckout.type).toBe('deferred');
    // enabled should be preserved from default
    expect(configCtx!.config.expressCheckout.enabled).toBe(DEFAULT_CONFIG.expressCheckout.enabled);
  });

  it('resets config to defaults', () => {
    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    act(() => {
      configCtx!.updateConfig({ captureMode: 'immediate', developerMode: false });
    });
    expect(configCtx!.config.captureMode).toBe('immediate');

    act(() => {
      configCtx!.resetConfig();
    });

    expect(configCtx!.config).toEqual(DEFAULT_CONFIG);
  });

  it('persists config to localStorage after mount', () => {
    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    act(() => {
      configCtx!.updateConfig({ captureMode: 'immediate' });
    });

    const stored = mockStorage['afterpay-demo-config'];
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored);
    expect(parsed.captureMode).toBe('immediate');
  });

  it('loads config from localStorage on mount', () => {
    const storedConfig = {
      ...DEFAULT_CONFIG,
      captureMode: 'immediate' as const,
      developerMode: false,
    };
    mockStorage['afterpay-demo-config'] = JSON.stringify(storedConfig);

    let configCtx: ReturnType<typeof useConfig> | undefined;
    render(
      <ConfigProvider>
        <ConfigConsumer onRender={(ctx) => { configCtx = ctx; }} />
      </ConfigProvider>
    );

    expect(configCtx!.config.captureMode).toBe('immediate');
    expect(configCtx!.config.developerMode).toBe(false);
  });

  it('throws when useConfig is used outside ConfigProvider', () => {
    // Suppress console.error for expected error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    function Orphan() {
      useConfig();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      'useConfig must be used within a ConfigProvider'
    );
  });
});
