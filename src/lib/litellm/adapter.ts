// drift-ignore-file
// ============================================================
// LITELLM ADAPTER
// Implements IDataAdapter using a self-hosted LiteLLM proxy.
//
// Required env vars:
//   LITELLM_BASE_URL    → e.g. http://localhost:4000
//   LITELLM_MASTER_KEY  → sk-...
//
// LiteLLM exposes:
//   GET  /spend/logs                → per-request spend logs
//   GET  /global/spend/models       → model-level aggregates
//   GET  /global/spend/keys         → key-level aggregates
//   GET  /health                    → health check
// ============================================================

import type {
  IDataAdapter,
  OverviewStats,
  TimeSeriesPoint,
  ModelStats,
  ModelProvider,
  RequestLog,
  RequestStatus,
  BudgetStatus,
} from "@/types";

function inferProvider(model: string): ModelProvider {
  const m = model.toLowerCase();
  if (m.includes("gpt") || m.includes("openai")) return "openai";
  if (m.includes("claude") || m.includes("anthropic")) return "anthropic";
  if (m.includes("gemini") || m.includes("google") || m.includes("palm")) return "google";
  if (m.includes("llama") || m.includes("meta")) return "meta";
  if (m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("qwen")) return "qwen";
  return "unknown";
}

interface LiteLLMSpendLog {
  request_id: string;
  startTime: string;
  endTime: string;
  model: string;
  spend: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_hit: string | boolean;
  api_key: string;
  user?: string;
}

interface LiteLLMModelSpend {
  model: string;
  total_spend: number;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class LiteLLMAdapter implements IDataAdapter {
  private baseUrl: string;
  private masterKey: string;

  constructor(baseUrl: string, masterKey: string) {
    if (!baseUrl) throw new Error("[LiteLLMAdapter] baseUrl is required");
    if (!masterKey) throw new Error("[LiteLLMAdapter] masterKey is required");
    this.baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
    this.masterKey = masterKey;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.masterKey}`,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[LiteLLM] ${path} → ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async fetchSpendLogs(from: Date, to: Date): Promise<LiteLLMSpendLog[]> {
    try {
      const data = await this.get<{ data: LiteLLMSpendLog[] }>("/spend/logs", {
        start_date: from.toISOString().split("T")[0],
        end_date: to.toISOString().split("T")[0],
      });
      return data.data ?? [];
    } catch (err) {
      console.error("[LiteLLMAdapter] fetchSpendLogs failed:", err);
      return [];
    }
  }

  private async fetchModelSpend(): Promise<LiteLLMModelSpend[]> {
    try {
      const data = await this.get<LiteLLMModelSpend[]>("/global/spend/models");
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[LiteLLMAdapter] fetchModelSpend failed:", err);
      return [];
    }
  }

  async getOverviewStats(from: Date, to: Date): Promise<OverviewStats> {
    const logs = await this.fetchSpendLogs(from, to);

    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration);
    const prevLogs = await this.fetchSpendLogs(prevFrom, from);

    const summarize = (entries: LiteLLMSpendLog[]) => ({
      requests: entries.length,
      cost: entries.reduce((s, l) => s + (l.spend ?? 0), 0),
      latency: entries.reduce((s, l) => {
        const start = new Date(l.startTime).getTime();
        const end = new Date(l.endTime).getTime();
        return s + (end - start);
      }, 0),
      errors: 0, // LiteLLM logs only successful completions typically
      cacheHits: entries.filter((l) => l.cache_hit === true || l.cache_hit === "True").length,
    });

    const curr = summarize(logs);
    const prev = summarize(prevLogs);

    const pct = (a: number, b: number) =>
      b === 0 ? 0 : Math.round(((a - b) / b) * 100);

    const models = new Set(logs.map((l) => l.model));

    return {
      totalRequests: curr.requests,
      totalCostUsd: curr.cost,
      avgLatencyMs: curr.requests > 0 ? curr.latency / curr.requests : 0,
      errorRate: 0,
      cacheHitRate: curr.requests > 0 ? (curr.cacheHits / curr.requests) * 100 : 0,
      activeModels: models.size,
      requestsDelta: pct(curr.requests, prev.requests),
      costDelta: pct(curr.cost, prev.cost),
      latencyDelta: pct(
        curr.requests > 0 ? curr.latency / curr.requests : 0,
        prev.requests > 0 ? prev.latency / prev.requests : 0
      ),
      errorRateDelta: 0,
      cacheHitRateDelta: pct(
        curr.requests > 0 ? curr.cacheHits / curr.requests : 0,
        prev.requests > 0 ? prev.cacheHits / prev.requests : 0
      ),
      activeModelsDelta: 0,
    };
  }

  async getTimeSeries(from: Date, to: Date, granularity: "hour" | "day"): Promise<TimeSeriesPoint[]> {
    const logs = await this.fetchSpendLogs(from, to);

    // Group by day or hour
    const buckets = new Map<string, { requests: number; cost: number; latency: number; tokens: number }>();

    for (const log of logs) {
      const d = new Date(log.startTime);
      const key = granularity === "day"
        ? d.toISOString().split("T")[0]
        : `${d.toISOString().split("T")[0]}T${String(d.getHours()).padStart(2, "0")}:00:00.000Z`;

      const existing = buckets.get(key) ?? { requests: 0, cost: 0, latency: 0, tokens: 0 };
      const latencyMs = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      buckets.set(key, {
        requests: existing.requests + 1,
        cost: existing.cost + (log.spend ?? 0),
        latency: existing.latency + latencyMs,
        tokens: existing.tokens + (log.total_tokens ?? 0),
      });
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, v]) => ({
        timestamp: new Date(timestamp).toISOString(),
        requests: v.requests,
        costUsd: v.cost,
        avgLatencyMs: v.requests > 0 ? v.latency / v.requests : 0,
        errors: 0,
        tokens: v.tokens,
      }));
  }

  async getModelStats(from: Date, to: Date): Promise<ModelStats[]> {
    const logs = await this.fetchSpendLogs(from, to);

    const grouped = new Map<string, {
      requests: number; cost: number; inputTokens: number;
      outputTokens: number; latencies: number[]; cacheHits: number;
    }>();

    for (const log of logs) {
      const m = log.model ?? "unknown";
      const existing = grouped.get(m) ?? {
        requests: 0, cost: 0, inputTokens: 0,
        outputTokens: 0, latencies: [], cacheHits: 0,
      };
      const latencyMs = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();
      grouped.set(m, {
        requests: existing.requests + 1,
        cost: existing.cost + (log.spend ?? 0),
        inputTokens: existing.inputTokens + (log.prompt_tokens ?? 0),
        outputTokens: existing.outputTokens + (log.completion_tokens ?? 0),
        latencies: [...existing.latencies, latencyMs],
        cacheHits: existing.cacheHits + (log.cache_hit === true || log.cache_hit === "True" ? 1 : 0),
      });
    }

    return Array.from(grouped.entries()).map(([model, stats]) => {
      const sortedLatencies = [...stats.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95 = sortedLatencies[p95Index] ?? 0;
      const avgLatency = stats.latencies.reduce((s, v) => s + v, 0) / (stats.latencies.length || 1);
      const totalToks = stats.inputTokens + stats.outputTokens;

      return {
        model,
        provider: inferProvider(model),
        totalRequests: stats.requests,
        successRate: 100,
        avgLatencyMs: avgLatency,
        p95LatencyMs: p95,
        totalCostUsd: stats.cost,
        totalTokens: totalToks,
        avgCostPerRequest: stats.requests > 0 ? stats.cost / stats.requests : 0,
        cacheHitRate: stats.requests > 0 ? (stats.cacheHits / stats.requests) * 100 : 0,
        tokenEfficiency: totalToks > 0 ? (stats.outputTokens / totalToks) * 100 : 0,
        costPer1kTokens: totalToks > 0 ? (stats.cost / totalToks) * 1000 : 0,
      };
    });
  }

  async getRequestLogs(options: {
    from: Date; to: Date; limit: number; offset: number;
    model?: string; status?: RequestStatus;
  }): Promise<{ logs: RequestLog[]; total: number }> {
    let rawLogs = await this.fetchSpendLogs(options.from, options.to);

    if (options.model) rawLogs = rawLogs.filter((l) => l.model === options.model);
    // LiteLLM only logs successful completions — status filter: hide error/cached if requested
    if (options.status === "error") return { logs: [], total: 0 };

    const logs: RequestLog[] = rawLogs.map((log) => {
      const isCache = log.cache_hit === true || log.cache_hit === "True";
      return {
        id: log.request_id,
        timestamp: log.startTime,
        model: log.model,
        provider: inferProvider(log.model),
        promptTokens: log.prompt_tokens ?? 0,
        completionTokens: log.completion_tokens ?? 0,
        totalTokens: log.total_tokens ?? 0,
        costUsd: log.spend ?? 0,
        latencyMs: new Date(log.endTime).getTime() - new Date(log.startTime).getTime(),
        status: isCache ? "cached" : "success",
        apiKeyAlias: log.api_key ? log.api_key.slice(0, 8) + "…" : "unknown",
        cacheHit: isCache,
      };
    });

    const total = logs.length;
    return { logs: logs.slice(options.offset, options.offset + options.limit), total };
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logs = await this.fetchSpendLogs(thirtyDaysAgo, new Date());

    const totalSpent = logs.reduce((s, l) => s + (l.spend ?? 0), 0);
    const avgDailySpend = logs.length > 0 ? totalSpent / 30 : 0;

    const today = new Date().toISOString().split("T")[0];
    const dailySpent = logs
      .filter((l) => l.startTime.startsWith(today))
      .reduce((s, l) => s + (l.spend ?? 0), 0);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlySpent = logs
      .filter((l) => new Date(l.startTime) >= startOfMonth)
      .reduce((s, l) => s + (l.spend ?? 0), 0);

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedMonthly = avgDailySpend * daysInMonth;

    // LiteLLM doesn't expose budget limits via API — use sensible defaults
    const monthlyLimit = 100;
    const dailyLimit = monthlyLimit / 30;
    const remaining = monthlyLimit - monthlySpent;

    return {
      dailyLimitUsd: dailyLimit,
      dailySpentUsd: dailySpent,
      monthlyLimitUsd: monthlyLimit,
      monthlySpentUsd: monthlySpent,
      projectedMonthlyUsd: projectedMonthly,
      daysUntilBudgetExhausted:
        avgDailySpend > 0 && remaining > 0 ? Math.floor(remaining / avgDailySpend) : null,
    };
  }
}
