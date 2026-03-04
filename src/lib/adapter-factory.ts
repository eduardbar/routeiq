// ============================================================
// ADAPTER FACTORY
// Single point of truth for which data source is active.
// Reads NEXT_PUBLIC_DATA_SOURCE env var:
//   "mock"       → MockAdapter (default, no keys needed)
//   "openrouter" → OpenRouterAdapter (requires OPENROUTER_API_KEY)
//   "litellm"    → LiteLLMAdapter (requires LITELLM_BASE_URL + LITELLM_MASTER_KEY)
// ============================================================

import type { IDataAdapter } from "@/types";
import { MockAdapter } from "./mock/adapter";
import { OpenRouterAdapter } from "./openrouter/adapter";

export type AdapterType = "mock" | "openrouter" | "litellm";

let instance: IDataAdapter | null = null;

export function getAdapter(): IDataAdapter {
  if (instance) return instance;

  const source = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as AdapterType;

  switch (source) {
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY ?? "";
      if (!apiKey) {
        console.warn( // drift-ignore — intentional fallback warning
          "[RouteIQ] OPENROUTER_API_KEY is not set — falling back to mock. " +
          "Set it in .env.local to use real data."
        );
        instance = new MockAdapter();
      } else {
        instance = new OpenRouterAdapter(apiKey);
      }
      break;
    }
    case "litellm":
      // Will be implemented on Day 7
      console.warn("[RouteIQ] LiteLLM adapter not yet implemented, falling back to mock"); // drift-ignore — intentional fallback warning
      instance = new MockAdapter();
      break;
    case "mock":
    default:
      instance = new MockAdapter();
  }

  return instance;
}

// Reset (useful for tests or switching sources at runtime)
export function resetAdapter(): void {
  instance = null;
}
