"use client";

import { useState, useEffect, useCallback } from "react";

export type ProviderType = "mock" | "openrouter" | "litellm";

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  litellmBaseUrl: string;
}

const STORAGE_KEY = "routeiq:provider-config";

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "mock",
  apiKey: "",
  litellmBaseUrl: "http://localhost:4000",
};

// ── Helpers ────────────────────────────────────────────────────

function loadFromStorage(): ProviderConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveToStorage(config: ProviderConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable — silent fail
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function useProviderConfig() {
  const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConfig(loadFromStorage());
    setLoaded(true);
  }, []);

  const save = useCallback((next: ProviderConfig) => {
    setConfig(next);
    saveToStorage(next);
  }, []);

  /**
   * Build headers to pass to API routes so they use the correct adapter.
   * Returns an empty object if using the default env-based adapter (mock).
   */
  const getApiHeaders = useCallback((): Record<string, string> => {
    if (!loaded || config.provider === "mock") return {};

    const headers: Record<string, string> = {
      "x-provider": config.provider,
    };

    if (config.apiKey) {
      headers["x-api-key"] = config.apiKey;
    }

    if (config.provider === "litellm" && config.litellmBaseUrl) {
      headers["x-litellm-base-url"] = config.litellmBaseUrl;
    }

    return headers;
  }, [config, loaded]);

  const isConfigured = loaded && (
    config.provider === "mock" ||
    (config.provider === "openrouter" && !!config.apiKey) ||
    (config.provider === "litellm" && !!config.apiKey && !!config.litellmBaseUrl)
  );

  return { config, save, getApiHeaders, loaded, isConfigured };
}
