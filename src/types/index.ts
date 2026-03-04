// ============================================================
// CORE DOMAIN TYPES
// Every piece of data in RouteIQ is typed here.
// The Adapter Layer transforms raw API responses into these.
// ============================================================

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "mistral"
  | "deepseek"
  | "qwen"
  | "unknown";

export type RequestStatus = "success" | "error" | "cached";

// A single LLM request log entry
export interface RequestLog {
  id: string;
  timestamp: string; // ISO 8601
  model: string; // e.g. "gpt-4o", "claude-3-haiku"
  provider: ModelProvider;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: RequestStatus;
  apiKeyAlias: string; // which key made the request
  cacheHit: boolean;
}

// Aggregated stats per model
export interface ModelStats {
  model: string;
  provider: ModelProvider;
  totalRequests: number;
  successRate: number; // 0-100
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  avgCostPerRequest: number;
  cacheHitRate: number; // 0-100
  /** completion tokens / total tokens × 100. Higher = more output per token spent */
  tokenEfficiency: number; // 0-100, percentage of tokens that are completion (output)
}

// KPI snapshot for the overview cards
export interface OverviewStats {
  totalRequests: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errorRate: number; // 0-100
  cacheHitRate: number; // 0-100
  activeModels: number;
  // deltas vs previous period (positive = increase)
  requestsDelta: number;
  costDelta: number;
  latencyDelta: number;
  errorRateDelta: number;
  cacheHitRateDelta: number;
  activeModelsDelta: number;
}

// A data point for time-series charts
export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601, grouped by hour or day
  requests: number;
  costUsd: number;
  avgLatencyMs: number;
  errors: number;
  tokens: number;
}

// Budget tracking
export interface BudgetStatus {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  monthlyLimitUsd: number;
  monthlySpentUsd: number;
  projectedMonthlyUsd: number; // burn rate extrapolation
  daysUntilBudgetExhausted: number | null; // null = won't exhaust
}

// Routing optimizer suggestion
export interface RoutingSuggestion {
  id: string;
  currentModel: string;
  suggestedModel: string;
  reason: string;
  estimatedSavingsUsd: number;
  estimatedSavingsPct: number;
  qualityImpact: "none" | "minimal" | "moderate";
  taskType: string; // e.g. "classification", "summarization", "code generation"
}

// Data source configuration
export type DataSourceType = "mock" | "litellm" | "openrouter";

export interface DataSourceConfig {
  type: DataSourceType;
  // LiteLLM config
  litellmBaseUrl?: string;
  litellmMasterKey?: string;
  // OpenRouter config
  openrouterApiKey?: string;
  openrouterManagementKey?: string;
}

// The contract every adapter must fulfill
export interface IDataAdapter {
  getOverviewStats(from: Date, to: Date): Promise<OverviewStats>;
  getTimeSeries(from: Date, to: Date, granularity: "hour" | "day"): Promise<TimeSeriesPoint[]>;
  getModelStats(from: Date, to: Date): Promise<ModelStats[]>;
  getRequestLogs(options: {
    from: Date;
    to: Date;
    limit: number;
    offset: number;
    model?: string;
    status?: RequestStatus;
  }): Promise<{ logs: RequestLog[]; total: number }>;
  getBudgetStatus(): Promise<BudgetStatus>;
}
