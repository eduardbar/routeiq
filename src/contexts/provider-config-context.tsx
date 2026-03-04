"use client";

import { createContext, useContext, ReactNode } from "react";
import { useProviderConfig } from "@/hooks/use-provider-config";

// ── Context ───────────────────────────────────────────────────

interface ProviderContextValue {
  getApiHeaders: () => Record<string, string>;
  providerLabel: string;
  loaded: boolean;
}

const ProviderContext = createContext<ProviderContextValue>({
  getApiHeaders: () => ({}),
  providerLabel: "Mock Data",
  loaded: false,
});

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Mock Data",
  openrouter: "OpenRouter",
  litellm: "LiteLLM",
};

// ── Provider component ────────────────────────────────────────

export function ProviderConfigProvider({ children }: { children: ReactNode }) {
  const { getApiHeaders, config, loaded } = useProviderConfig();

  return (
    <ProviderContext.Provider
      value={{
        getApiHeaders,
        providerLabel: PROVIDER_LABELS[config.provider] ?? "Mock Data",
        loaded,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

export function useProviderHeaders() {
  return useContext(ProviderContext);
}
