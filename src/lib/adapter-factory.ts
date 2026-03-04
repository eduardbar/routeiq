// ============================================================
// ADAPTER FACTORY
// Single point of truth for which data source is active.
//
// Priority order (highest → lowest):
//   1. Runtime headers (X-Provider + X-Api-Key) — set by Settings UI
//   2. NEXT_PUBLIC_DATA_SOURCE env var
//   3. Default: MockAdapter
//
// This allows users to switch providers from the UI without
// touching .env.local or restarting the dev server.
// ============================================================

import type { IDataAdapter } from "@/types";
import { MockAdapter } from "./mock/adapter";
import { OpenRouterAdapter } from "./openrouter/adapter";
import { LiteLLMAdapter } from "./litellm/adapter";

export type AdapterType = "mock" | "openrouter" | "litellm";

// Module-level singleton (for env-based adapter only)
let envInstance: IDataAdapter | null = null;

// ── Runtime adapter (from request headers) ───────────────────────────────────

export interface RuntimeAdapterConfig {
  provider: string;        // "openrouter" | "litellm" | "mock"
  apiKey?: string;
  litellmBaseUrl?: string;
}

/**
 * Create an adapter instance from runtime config (from request headers).
 * Returns null if config is insufficient.
 */
export function createRuntimeAdapter(config: RuntimeAdapterConfig): IDataAdapter | null {
  switch (config.provider) {
    case "openrouter":
      if (!config.apiKey) return null;
      return new OpenRouterAdapter(config.apiKey);

    case "litellm":
      if (!config.litellmBaseUrl || !config.apiKey) return null;
      return new LiteLLMAdapter(config.litellmBaseUrl, config.apiKey);

    case "mock":
      return new MockAdapter();

    default:
      return null;
  }
}

// ── Env-based singleton adapter ───────────────────────────────────────────────

export function getAdapter(): IDataAdapter {
  if (envInstance) return envInstance;

  const source = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as AdapterType;

  switch (source) {
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY ?? "";
      if (!apiKey) {
        console.warn( // drift-ignore — intentional fallback warning
          "[RouteIQ] OPENROUTER_API_KEY is not set — falling back to mock. " +
          "Set it in .env.local to use real data."
        );
        envInstance = new MockAdapter();
      } else {
        envInstance = new OpenRouterAdapter(apiKey);
      }
      break;
    }
    case "litellm": {
      const baseUrl = process.env.LITELLM_BASE_URL ?? "";
      const masterKey = process.env.LITELLM_MASTER_KEY ?? "";
      if (!baseUrl || !masterKey) {
        console.warn("[RouteIQ] LITELLM_BASE_URL or LITELLM_MASTER_KEY not set — falling back to mock"); // drift-ignore — intentional fallback warning
        envInstance = new MockAdapter();
      } else {
        envInstance = new LiteLLMAdapter(baseUrl, masterKey);
      }
      break;
    }
    case "mock":
    default:
      envInstance = new MockAdapter();
  }

  return envInstance;
}

/**
 * Get adapter for a request — checks runtime headers first, then env.
 * Use this in API routes to support per-request provider switching.
 */
export function getAdapterForRequest(headers: Headers): IDataAdapter {
  const provider = headers.get("x-provider");
  const apiKey = headers.get("x-api-key");
  const litellmBaseUrl = headers.get("x-litellm-base-url");

  if (provider && provider !== "mock") {
    const runtime = createRuntimeAdapter({ provider, apiKey: apiKey ?? undefined, litellmBaseUrl: litellmBaseUrl ?? undefined });
    if (runtime) return runtime;
  }

  return getAdapter();
}

// Reset (useful for tests or switching sources at runtime)
export function resetAdapter(): void {
  envInstance = null;
}
