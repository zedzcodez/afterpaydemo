export interface AppConfig {
  expressCheckout: {
    enabled: boolean;
    type: "integrated" | "deferred";
  };
  cashAppPay: {
    enabled: boolean;
  };
  standardCheckout: {
    method: "popup" | "redirect";
  };
  captureMode: "deferred" | "immediate";
  developerMode: boolean;
}

import { LOCAL_STORAGE_KEYS } from "./storage-keys";

export const DEFAULT_CONFIG: AppConfig = {
  expressCheckout: {
    enabled: true,
    type: "integrated",
  },
  cashAppPay: {
    enabled: true,
  },
  standardCheckout: {
    method: "popup",
  },
  captureMode: "deferred",
  developerMode: true,
};

/**
 * Merge a stored (possibly partial/outdated) config with defaults,
 * so new fields always get default values.
 */
function mergeWithDefaults(stored: Partial<AppConfig>): AppConfig {
  return {
    expressCheckout: {
      ...DEFAULT_CONFIG.expressCheckout,
      ...(stored.expressCheckout ?? {}),
    },
    cashAppPay: {
      ...DEFAULT_CONFIG.cashAppPay,
      ...(stored.cashAppPay ?? {}),
    },
    standardCheckout: {
      ...DEFAULT_CONFIG.standardCheckout,
      ...(stored.standardCheckout ?? {}),
    },
    captureMode: stored.captureMode ?? DEFAULT_CONFIG.captureMode,
    developerMode: stored.developerMode ?? DEFAULT_CONFIG.developerMode,
  };
}

export function getStoredConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CONFIG);
    if (!stored) return DEFAULT_CONFIG;
    const parsed = JSON.parse(stored);
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.CONFIG, JSON.stringify(config));
}
