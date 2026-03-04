// ============================================================
// ADAPTER FACTORY
// Single point of truth for which data source is active.
// Reads NEXT_PUBLIC_DATA_SOURCE env var:
//   "mock"       → MockAdapter (default, no keys needed)
//   "openrouter" → OpenRouterAdapter
//   "litellm"    → LiteLLMAdapter
// ============================================================

import type { IDataAdapter } from "@/types";
import { MockAdapter } from "./mock/adapter";

export type AdapterType = "mock" | "openrouter" | "litellm";

let instance: IDataAdapter | null = null;

export function getAdapter(): IDataAdapter {
  if (instance) return instance;

  const source = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") as AdapterType;

  switch (source) {
    case "openrouter":
      // Will be implemented on Day 6
      console.warn("[RouteIQ] OpenRouter adapter not yet implemented, falling back to mock");
      instance = new MockAdapter();
      break;
    case "litellm":
      // Will be implemented on Day 6
      console.warn("[RouteIQ] LiteLLM adapter not yet implemented, falling back to mock");
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
