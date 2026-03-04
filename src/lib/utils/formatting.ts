// Shared provider utilities — colors, labels, icons per LLM provider
// Used in model tables, charts, badges across the whole app

import type { ModelProvider } from "@/types";

export const PROVIDER_CONFIG: Record<
  ModelProvider,
  { label: string; color: string; bg: string }
> = {
  openai:    { label: "OpenAI",    color: "#10a37f", bg: "bg-emerald-500/10" },
  anthropic: { label: "Anthropic", color: "#d4763b", bg: "bg-orange-500/10" },
  google:    { label: "Google",    color: "#4285f4", bg: "bg-blue-500/10" },
  meta:      { label: "Meta",      color: "#0866ff", bg: "bg-blue-600/10" },
  mistral:   { label: "Mistral",   color: "#7c3aed", bg: "bg-violet-500/10" },
  deepseek:  { label: "DeepSeek",  color: "#06b6d4", bg: "bg-cyan-500/10" },
  qwen:      { label: "Qwen",      color: "#f59e0b", bg: "bg-amber-500/10" },
  unknown:   { label: "Unknown",   color: "#6b7280", bg: "bg-gray-500/10" },
};

export function getProviderConfig(provider: ModelProvider) {
  return PROVIDER_CONFIG[provider] ?? PROVIDER_CONFIG.unknown;
}

// Format helpers reused in tables and tooltips
export function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return `$${(usd * 1_000_000).toFixed(1)}µ`;
  if (usd < 0.01)   return `$${(usd * 1000).toFixed(2)}m`;
  if (usd < 1)      return `$${usd.toFixed(4)}`;
  if (usd < 100)    return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(0)}`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
