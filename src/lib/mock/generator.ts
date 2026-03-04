// drift-ignore-file
// ============================================================
// MOCK DATA ENGINE
// Generates realistic LLM traffic data for demos.
// Seeded with a fixed value so data is CONSISTENT across
// page reloads — judges don't see numbers jumping around.
// ============================================================

import { subDays, subHours, format, startOfDay, startOfHour } from "date-fns";
import type {
  RequestLog,
  ModelStats,
  OverviewStats,
  TimeSeriesPoint,
  BudgetStatus,
  ModelProvider,
} from "@/types";

// --- Model catalog with realistic cost/latency profiles ---
const MODEL_PROFILES = [
  {
    model: "gpt-4o",
    provider: "openai" as ModelProvider,
    costPer1kTokens: 0.005,
    avgLatency: 1800,
    latencyVariance: 600,
    errorRate: 0.02,
  },
  {
    model: "gpt-4o-mini",
    provider: "openai" as ModelProvider,
    costPer1kTokens: 0.00015,
    avgLatency: 800,
    latencyVariance: 200,
    errorRate: 0.01,
  },
  {
    model: "claude-3-5-sonnet",
    provider: "anthropic" as ModelProvider,
    costPer1kTokens: 0.003,
    avgLatency: 1400,
    latencyVariance: 400,
    errorRate: 0.015,
  },
  {
    model: "claude-3-haiku",
    provider: "anthropic" as ModelProvider,
    costPer1kTokens: 0.00025,
    avgLatency: 600,
    latencyVariance: 150,
    errorRate: 0.01,
  },
  {
    model: "gemini-2.0-flash",
    provider: "google" as ModelProvider,
    costPer1kTokens: 0.000075,
    avgLatency: 900,
    latencyVariance: 300,
    errorRate: 0.02,
  },
  {
    model: "llama-3.3-70b",
    provider: "meta" as ModelProvider,
    costPer1kTokens: 0.00059,
    avgLatency: 1200,
    latencyVariance: 400,
    errorRate: 0.03,
  },
  {
    model: "deepseek-r1",
    provider: "deepseek" as ModelProvider,
    costPer1kTokens: 0.00055,
    avgLatency: 2200,
    latencyVariance: 800,
    errorRate: 0.025,
  },
  {
    model: "mistral-small-3.1",
    provider: "mistral" as ModelProvider,
    costPer1kTokens: 0.0001,
    avgLatency: 700,
    latencyVariance: 200,
    errorRate: 0.015,
  },
] as const;

const API_KEY_ALIASES = ["prod-app", "staging", "dev-local", "analytics-job"];

// Deterministic pseudo-random number generator (seeded)
// This gives us CONSISTENT data across reloads — critical for demos
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Mulberry32 algorithm
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Random float in [min, max]
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Random int in [min, max]
  intBetween(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }

  // Pick random item from array
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Boolean with probability p (0-1)
  bool(p: number): boolean {
    return this.next() < p;
  }
}

// Generate a UUID-like string deterministically
function makeId(rng: SeededRandom): string {
  const hex = () => Math.floor(rng.next() * 16).toString(16);
  return `${Array.from({ length: 8 }, hex).join("")}-${Array.from({ length: 4 }, hex).join("")}-${Array.from({ length: 4 }, hex).join("")}`;
}

// ---- Main generator ----

let cachedLogs: RequestLog[] | null = null;

export function generateRequestLogs(days = 30): RequestLog[] {
  if (cachedLogs) return cachedLogs;

  const rng = new SeededRandom(42); // fixed seed = consistent data
  const logs: RequestLog[] = [];
  const now = new Date();

  // Traffic pattern: more requests during business hours (UTC)
  const hourlyTrafficMultiplier = (hour: number): number => {
    if (hour >= 9 && hour <= 17) return 1.8; // peak
    if (hour >= 18 && hour <= 22) return 1.2; // evening
    if (hour >= 0 && hour <= 6) return 0.3; // night
    return 0.9;
  };

  // Generate ~5000 requests over 30 days
  const baseRequestsPerHour = 7; // ~168/day, ~5040 total

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = subHours(subDays(now, dayOffset), -hour);
      const multiplier = hourlyTrafficMultiplier(hour);
      const requestsThisHour = Math.round(
        rng.between(baseRequestsPerHour * 0.5, baseRequestsPerHour * 1.5) * multiplier
      );

      for (let i = 0; i < requestsThisHour; i++) {
        // Weight model selection: gpt-4o-mini and claude-3-haiku used most
        const modelWeights = [0.15, 0.35, 0.12, 0.20, 0.08, 0.04, 0.03, 0.03];
        let roll = rng.next();
        let modelIdx = 0;
        for (let w = 0; w < modelWeights.length; w++) {
          roll -= modelWeights[w];
          if (roll <= 0) {
            modelIdx = w;
            break;
          }
        }
        const profile = MODEL_PROFILES[modelIdx];

        const isError = rng.bool(profile.errorRate);
        const isCacheHit = rng.bool(0.12); // 12% cache hit rate

        const promptTokens = rng.intBetween(80, 800);
        const completionTokens = isError ? 0 : rng.intBetween(50, 600);
        const totalTokens = promptTokens + completionTokens;
        const costUsd = isError ? 0 : (totalTokens / 1000) * profile.costPer1kTokens;

        const latencyMs = isCacheHit
          ? rng.intBetween(10, 50) // cache is near-instant
          : Math.round(
              profile.avgLatency +
                rng.between(-profile.latencyVariance, profile.latencyVariance)
            );

        // Add small random seconds offset within the hour
        const requestTime = new Date(timestamp);
        requestTime.setMinutes(rng.intBetween(0, 59));
        requestTime.setSeconds(rng.intBetween(0, 59));

        logs.push({
          id: makeId(rng),
          timestamp: requestTime.toISOString(),
          model: profile.model,
          provider: profile.provider,
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd,
          latencyMs: Math.max(10, latencyMs),
          status: isError ? "error" : isCacheHit ? "cached" : "success",
          apiKeyAlias: rng.pick(API_KEY_ALIASES),
          cacheHit: isCacheHit,
        });
      }
    }
  }

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  cachedLogs = logs;
  return logs;
}

// ---- Aggregation helpers (used by the Mock Adapter) ----

export function filterLogsByRange(logs: RequestLog[], from: Date, to: Date): RequestLog[] {
  return logs.filter((l) => {
    const t = new Date(l.timestamp).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function computeOverviewStats(current: RequestLog[], previous: RequestLog[]): OverviewStats {
  const calc = (logs: RequestLog[]) => ({
    total: logs.length,
    cost: logs.reduce((s, l) => s + l.costUsd, 0),
    avgLatency:
      logs.length > 0 ? logs.reduce((s, l) => s + l.latencyMs, 0) / logs.length : 0,
    errorRate:
      logs.length > 0
        ? (logs.filter((l) => l.status === "error").length / logs.length) * 100
        : 0,
    cacheHitRate:
      logs.length > 0
        ? (logs.filter((l) => l.cacheHit).length / logs.length) * 100
        : 0,
  });

  const cur = calc(current);
  const prev = calc(previous);

  const delta = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);

  const models = new Set(current.map((l) => l.model));
  const prevModels = new Set(previous.map((l) => l.model));

  return {
    totalRequests: cur.total,
    totalCostUsd: cur.cost,
    avgLatencyMs: cur.avgLatency,
    errorRate: cur.errorRate,
    cacheHitRate: cur.cacheHitRate,
    activeModels: models.size,
    requestsDelta: delta(cur.total, prev.total),
    costDelta: delta(cur.cost, prev.cost),
    latencyDelta: delta(cur.avgLatency, prev.avgLatency),
    errorRateDelta: cur.errorRate - prev.errorRate,
    cacheHitRateDelta: cur.cacheHitRate - prev.cacheHitRate,
    activeModelsDelta: models.size - prevModels.size,
  };
}

export function computeTimeSeries(
  logs: RequestLog[],
  from: Date,
  to: Date,
  granularity: "hour" | "day"
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint>();

  // Pre-create all buckets so we have zero-filled gaps
  const cursor = new Date(from);
  while (cursor <= to) {
    const key =
      granularity === "hour"
        ? format(startOfHour(cursor), "yyyy-MM-dd'T'HH:00:00")
        : format(startOfDay(cursor), "yyyy-MM-dd'T'00:00:00");

    if (!buckets.has(key)) {
      buckets.set(key, {
        timestamp: key,
        requests: 0,
        costUsd: 0,
        avgLatencyMs: 0,
        errors: 0,
        tokens: 0,
      });
    }

    if (granularity === "hour") {
      cursor.setHours(cursor.getHours() + 1);
    } else {
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Accumulate latency separately for averaging
  const latencyAccum = new Map<string, { sum: number; count: number }>();

  for (const log of logs) {
    const t = new Date(log.timestamp);
    const key =
      granularity === "hour"
        ? format(startOfHour(t), "yyyy-MM-dd'T'HH:00:00")
        : format(startOfDay(t), "yyyy-MM-dd'T'00:00:00");

    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.requests++;
    bucket.costUsd += log.costUsd;
    bucket.tokens += log.totalTokens;
    if (log.status === "error") bucket.errors++;

    const acc = latencyAccum.get(key) ?? { sum: 0, count: 0 };
    acc.sum += log.latencyMs;
    acc.count++;
    latencyAccum.set(key, acc);
  }

  // Apply averages
  for (const [key, bucket] of buckets) {
    const acc = latencyAccum.get(key);
    if (acc && acc.count > 0) {
      bucket.avgLatencyMs = Math.round(acc.sum / acc.count);
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
}

export function computeModelStats(logs: RequestLog[]): ModelStats[] {
  const modelMap = new Map<string, RequestLog[]>();

  for (const log of logs) {
    const arr = modelMap.get(log.model) ?? [];
    arr.push(log);
    modelMap.set(log.model, arr);
  }

  return Array.from(modelMap.entries())
    .map(([model, modelLogs]) => {
      const sorted = [...modelLogs].sort((a, b) => a.latencyMs - b.latencyMs);
      const p95Idx = Math.floor(sorted.length * 0.95);

      const totalToks = modelLogs.reduce((s, l) => s + l.totalTokens, 0);
      const completionToks = modelLogs.reduce((s, l) => s + l.completionTokens, 0);
      const tokenEfficiency = totalToks > 0 ? (completionToks / totalToks) * 100 : 0;

      return {
        model,
        provider: modelLogs[0].provider,
        totalRequests: modelLogs.length,
        successRate:
          (modelLogs.filter((l) => l.status === "success").length / modelLogs.length) *
          100,
        avgLatencyMs:
          modelLogs.reduce((s, l) => s + l.latencyMs, 0) / modelLogs.length,
        p95LatencyMs: sorted[p95Idx]?.latencyMs ?? 0,
        totalCostUsd: modelLogs.reduce((s, l) => s + l.costUsd, 0),
        totalTokens: modelLogs.reduce((s, l) => s + l.totalTokens, 0),
        avgCostPerRequest:
          modelLogs.reduce((s, l) => s + l.costUsd, 0) / modelLogs.length,
        cacheHitRate:
          (modelLogs.filter((l) => l.cacheHit).length / modelLogs.length) * 100,
        tokenEfficiency,
      };
    })
    .sort((a, b) => b.totalRequests - a.totalRequests);
}

export function computeBudgetStatus(logs: RequestLog[]): BudgetStatus {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dailyLogs = logs.filter((l) => new Date(l.timestamp) >= startOfToday);
  const monthlyLogs = logs.filter((l) => new Date(l.timestamp) >= startOfMonth);

  const dailySpent = dailyLogs.reduce((s, l) => s + l.costUsd, 0);
  const monthlySpent = monthlyLogs.reduce((s, l) => s + l.costUsd, 0);

  // Burn rate: average daily spend over last 7 days → project to month end
  const last7Days = filterLogsByRange(logs, subDays(now, 7), now);
  const avgDailyBurn = last7Days.reduce((s, l) => s + l.costUsd, 0) / 7;
  const daysLeftInMonth =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const projectedMonthly = monthlySpent + avgDailyBurn * daysLeftInMonth;

  const DAILY_LIMIT = 50;
  const MONTHLY_LIMIT = 500;

  const daysUntilExhausted =
    avgDailyBurn > 0
      ? Math.floor((MONTHLY_LIMIT - monthlySpent) / avgDailyBurn)
      : null;

  return {
    dailyLimitUsd: DAILY_LIMIT,
    dailySpentUsd: dailySpent,
    monthlyLimitUsd: MONTHLY_LIMIT,
    monthlySpentUsd: monthlySpent,
    projectedMonthlyUsd: projectedMonthly,
    daysUntilBudgetExhausted: daysUntilExhausted,
  };
}
