// drift-ignore-file
// ============================================================
// OPENROUTER ADAPTER
// Implements IDataAdapter using real OpenRouter Management API.
//
// Strategy per method:
//   getOverviewStats  → /api/v1/activity (aggregate) + /api/v1/credits
//   getTimeSeries     → /api/v1/activity?group_by=day
//   getModelStats     → /api/v1/activity?group_by=model
//   getRequestLogs    → best-effort: no list endpoint exists for individual
//                       requests on a standard key → returns structured
//                       activity entries shaped as "synthetic" log rows
//   getBudgetStatus   → /api/v1/credits + /api/v1/auth/key
//
// Fallback: any fetch failure returns a graceful error object,
// never throws to the UI.
// ============================================================

import { format, eachDayOfInterval, startOfDay } from "date-fns";
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
import type {
  OpenRouterActivity,
  OpenRouterActivityEntry,
  OpenRouterCredits,
  OpenRouterKeyInfo,
} from "./types";

const BASE_URL = "https://openrouter.ai/api/v1";

// Map OpenRouter provider_name/model prefix → our ModelProvider type
function inferProvider(model: string): ModelProvider {
  const m = model.toLowerCase();
  if (m.startsWith("openai/") || m.includes("gpt")) return "openai";
  if (m.startsWith("anthropic/") || m.includes("claude")) return "anthropic";
  if (m.startsWith("google/") || m.includes("gemini") || m.includes("palm")) return "google";
  if (m.startsWith("meta-llama/") || m.includes("llama")) return "meta";
  if (m.startsWith("mistralai/") || m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (m.startsWith("deepseek/") || m.includes("deepseek")) return "deepseek";
  if (m.startsWith("qwen/") || m.includes("qwen")) return "qwen";
  return "unknown";
}

// Strip the provider prefix for display: "openai/gpt-4o" → "gpt-4o"
function shortModelName(model: string): string {
  const slash = model.indexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

export class OpenRouterAdapter implements IDataAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("[OpenRouterAdapter] apiKey is required");
    this.apiKey = apiKey;
  }

  // ── HTTP helpers ────────────────────────────────────────────

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://routeiq.vercel.app",
      "X-Title": "RouteIQ",
    };
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: this.headers(),
      // Next.js: don't cache — we always want fresh data in the API routes
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[OpenRouter] ${path} → ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Fetch helpers ───────────────────────────────────────────

  private async fetchActivity(
    from: Date,
    to: Date,
    groupBy: "day" | "model"
  ): Promise<OpenRouterActivityEntry[]> {
    try {
      const data = await this.get<OpenRouterActivity>("/activity", {
        start_date: format(from, "yyyy-MM-dd"),
        end_date: format(to, "yyyy-MM-dd"),
        group_by: groupBy,
      });
      return data.data ?? [];
    } catch (err) {
      console.error("[OpenRouterAdapter] fetchActivity failed:", err);
      return [];
    }
  }

  private async fetchCredits(): Promise<OpenRouterCredits["data"] | null> {
    try {
      const data = await this.get<OpenRouterCredits>("/credits");
      return data.data ?? null;
    } catch (err) {
      console.error("[OpenRouterAdapter] fetchCredits failed:", err);
      return null;
    }
  }

  private async fetchKeyInfo(): Promise<OpenRouterKeyInfo["data"] | null> {
    try {
      const data = await this.get<OpenRouterKeyInfo>("/auth/key");
      return data.data ?? null;
    } catch (err) {
      console.error("[OpenRouterAdapter] fetchKeyInfo failed:", err);
      return null;
    }
  }

  // ── IDataAdapter implementation ─────────────────────────────

  async getOverviewStats(from: Date, to: Date): Promise<OverviewStats> {
    const [currentActivity, prevActivity] = await Promise.all([
      this.fetchActivity(from, to, "day"),
      this.fetchActivity(
        new Date(from.getTime() - (to.getTime() - from.getTime())),
        from,
        "day"
      ),
    ]);

    const sum = (entries: OpenRouterActivityEntry[]) =>
      entries.reduce(
        (acc, e) => ({
          requests: acc.requests + e.requests,
          cost: acc.cost + e.cost,
          tokens: acc.tokens + e.input_tokens + e.output_tokens,
        }),
        { requests: 0, cost: 0, tokens: 0 }
      );

    const curr = sum(currentActivity);
    const prev = sum(prevActivity);

    const pct = (a: number, b: number) =>
      b === 0 ? 0 : Math.round(((a - b) / b) * 100);

    // OpenRouter activity API does not expose error counts or latency in
    // aggregate — we use 0 for those (real data only comes from /generation)
    return {
      totalRequests: curr.requests,
      totalCostUsd: curr.cost,
      avgLatencyMs: 0, // not available in aggregate API
      errorRate: 0,    // not available in aggregate API
      cacheHitRate: 0, // not available in aggregate API
      activeModels: 0, // will be populated by getModelStats
      requestsDelta: pct(curr.requests, prev.requests),
      costDelta: pct(curr.cost, prev.cost),
      latencyDelta: 0,
      errorRateDelta: 0,
      cacheHitRateDelta: 0, // not available in aggregate API
      activeModelsDelta: 0, // not available in aggregate API
    };
  }

  async getTimeSeries(
    from: Date,
    to: Date,
    _granularity: "hour" | "day"
  ): Promise<TimeSeriesPoint[]> {
    // OpenRouter activity only supports day-level grouping (granularity param ignored)
    const activity = await this.fetchActivity(from, to, "day");

    // Build a map by date string for O(1) lookup
    const byDate = new Map<string, OpenRouterActivityEntry>();
    for (const entry of activity) {
      byDate.set(entry.date, entry);
    }

    // Fill every day in range (including zeros for missing days)
    const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });

    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const entry = byDate.get(key);
      return {
        timestamp: day.toISOString(),
        requests: entry?.requests ?? 0,
        costUsd: entry?.cost ?? 0,
        avgLatencyMs: 0, // not in aggregate API
        errors: 0,       // not in aggregate API
        tokens: entry ? entry.input_tokens + entry.output_tokens : 0,
      };
    });
  }

  async getModelStats(from: Date, to: Date): Promise<ModelStats[]> {
    const activity = await this.fetchActivity(from, to, "model");

    // Group by model (API may return multiple entries per model across days)
    const grouped = new Map<
      string,
      { requests: number; cost: number; inputTokens: number; outputTokens: number }
    >();

    for (const entry of activity) {
      const model = entry.model ?? "unknown";
      const existing = grouped.get(model) ?? {
        requests: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      grouped.set(model, {
        requests: existing.requests + entry.requests,
        cost: existing.cost + entry.cost,
        inputTokens: existing.inputTokens + entry.input_tokens,
        outputTokens: existing.outputTokens + entry.output_tokens,
      });
    }

    return Array.from(grouped.entries()).map(([model, stats]) => {
      const totalToks = stats.inputTokens + stats.outputTokens;
      const tokenEfficiency = totalToks > 0 ? (stats.outputTokens / totalToks) * 100 : 0;

      return {
        model: shortModelName(model),
        provider: inferProvider(model),
        totalRequests: stats.requests,
        successRate: 100, // not available in aggregate API — assume success
        avgLatencyMs: 0,  // not available
        p95LatencyMs: 0,  // not available
        totalCostUsd: stats.cost,
        totalTokens: totalToks,
        avgCostPerRequest: stats.requests > 0 ? stats.cost / stats.requests : 0,
        cacheHitRate: 0,  // not available
        tokenEfficiency,
      };
    });
  }

  async getRequestLogs(options: {
    from: Date;
    to: Date;
    limit: number;
    offset: number;
    model?: string;
    status?: RequestStatus;
  }): Promise<{ logs: RequestLog[]; total: number }> {
    // OpenRouter does NOT provide a paginated list of individual requests
    // on a standard API key. We synthesize log rows from the day-level
    // activity data as a best-effort representation.

    // Build one synthetic log per day per model (model-level activity)
    // For a richer log view, the user should use the Management API or LiteLLM.
    const modelActivity = await this.fetchActivity(options.from, options.to, "model");
    const logs: RequestLog[] = [];
    let idCounter = 0;

    for (const entry of modelActivity) {
      if (entry.requests === 0) continue;
      const model = shortModelName(entry.model ?? "unknown");
      const provider = inferProvider(entry.model ?? "unknown");

      // Skip if model filter is set and doesn't match
      if (options.model && model !== options.model) continue;
      // Skip errors filter (we don't have error data)
      if (options.status && options.status !== "success") continue;

      const avgCost = entry.requests > 0 ? entry.cost / entry.requests : 0;
      const avgInputTokens = entry.requests > 0
        ? Math.round(entry.input_tokens / entry.requests)
        : 0;
      const avgOutputTokens = entry.requests > 0
        ? Math.round(entry.output_tokens / entry.requests)
        : 0;

      // Create a representative synthetic log entry for this model
      logs.push({
        id: `or-synth-${idCounter++}`,
        timestamp: entry.date
          ? new Date(entry.date).toISOString()
          : new Date().toISOString(),
        model,
        provider,
        promptTokens: avgInputTokens,
        completionTokens: avgOutputTokens,
        totalTokens: avgInputTokens + avgOutputTokens,
        costUsd: avgCost,
        latencyMs: 0,
        status: "success",
        apiKeyAlias: "openrouter-key",
        cacheHit: false,
      });
    }

    // Add a note: these are synthetic entries, one per model
    // Real per-request logs require OpenRouter Management API
    const total = logs.length;
    const paginated = logs.slice(options.offset, options.offset + options.limit);

    return { logs: paginated, total };
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    const [credits, keyInfo] = await Promise.all([
      this.fetchCredits(),
      this.fetchKeyInfo(),
    ]);

    const totalCredits = credits?.total_credits ?? 0;

    // Key-level limit (if set)
    const keyLimit = keyInfo?.limit ?? null;

    // Estimate daily spend from the last 30 days of activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivity = await this.fetchActivity(thirtyDaysAgo, new Date(), "day");
    const totalRecentCost = recentActivity.reduce((sum, e) => sum + e.cost, 0);
    const avgDailySpend = recentActivity.length > 0
      ? totalRecentCost / recentActivity.length
      : 0;

    // Today's spend: last entry in activity
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayEntry = recentActivity.find((e) => e.date === todayStr);
    const dailySpent = todayEntry?.cost ?? 0;

    // Monthly: current month activity
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthActivity = recentActivity.filter(
      (e) => new Date(e.date) >= startOfMonth
    );
    const monthlySpent = monthActivity.reduce((sum, e) => sum + e.cost, 0);

    // Projected monthly = average daily * days in month
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const projectedMonthly = avgDailySpend * daysInMonth;

    // Monthly limit: use key limit or total credits
    const monthlyLimit = keyLimit ?? totalCredits;

    const remainingBudget = monthlyLimit - monthlySpent;
    const daysUntilExhausted =
      avgDailySpend > 0 && remainingBudget > 0
        ? Math.floor(remainingBudget / avgDailySpend)
        : null;

    // Daily limit: 1/30th of monthly limit as a sensible default
    const dailyLimit = monthlyLimit / 30;

    return {
      dailyLimitUsd: dailyLimit,
      dailySpentUsd: dailySpent,
      monthlyLimitUsd: monthlyLimit,
      monthlySpentUsd: monthlySpent,
      projectedMonthlyUsd: projectedMonthly,
      daysUntilBudgetExhausted: daysUntilExhausted,
    };
  }
}
