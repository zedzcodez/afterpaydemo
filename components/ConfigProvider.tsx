"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  AppConfig,
  DEFAULT_CONFIG,
  getStoredConfig,
  saveConfig,
} from "@/lib/config";

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (updates: DeepPartial<AppConfig>) => void;
  resetConfig: () => void;
}

/** Utility type for deep partial updates */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

/**
 * Deep merge partial updates into an existing config object.
 */
function deepMergeUpdate(
  base: AppConfig,
  updates: DeepPartial<AppConfig>
): AppConfig {
  return {
    expressCheckout: {
      ...base.expressCheckout,
      ...updates.expressCheckout,
    },
    cashAppPay: {
      ...base.cashAppPay,
      ...updates.cashAppPay,
    },
    standardCheckout: {
      ...base.standardCheckout,
      ...updates.standardCheckout,
    },
    captureMode: updates.captureMode ?? base.captureMode,
    developerMode: updates.developerMode ?? base.developerMode,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = getStoredConfig();
    setConfig(stored);
    setMounted(true);
  }, []);

  // Auto-save to localStorage on config change
  useEffect(() => {
    if (mounted) {
      saveConfig(config);
    }
  }, [config, mounted]);

  const updateConfig = (updates: DeepPartial<AppConfig>) => {
    setConfig((prev) => deepMergeUpdate(prev, updates));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const value: ConfigContextType = {
    config,
    updateConfig,
    resetConfig,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}
