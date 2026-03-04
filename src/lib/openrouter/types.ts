// ============================================================
// OPENROUTER RAW API TYPES
// These match exactly what the OpenRouter API returns.
// The adapter transforms them into RouteIQ domain types.
//
// Docs: https://openrouter.ai/docs/api-reference
// ============================================================

// GET /api/v1/auth/key
export interface OpenRouterKeyInfo {
  data: {
    label: string;
    usage: number;       // USD used
    limit: number | null; // USD limit, null = unlimited
    is_free_tier: boolean;
    rate_limit: {
      requests: number;
      interval: string;  // e.g. "10s"
    };
  };
}

// GET /api/v1/credits
export interface OpenRouterCredits {
  data: {
    total_credits: number;   // USD total credits purchased
    total_usage: number;     // USD total used
  };
}

// GET /api/v1/activity
// Returns usage grouped by day or model, depending on query params
export interface OpenRouterActivityEntry {
  date: string;           // "YYYY-MM-DD" when grouped by day
  model?: string;         // present when grouped by model
  app_id?: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;           // USD
}

export interface OpenRouterActivity {
  data: OpenRouterActivityEntry[];
}

// GET /api/v1/generation?id={id}
// Metadata for a single generation/request
export interface OpenRouterGeneration {
  data: {
    id: string;
    model: string;
    streamed: boolean;
    generation_time: number;        // ms
    created_at: string;             // ISO 8601
    tokens_prompt: number;
    tokens_completion: number;
    native_tokens_prompt: number | null;
    native_tokens_completion: number | null;
    num_media_prompt: number | null;
    num_media_completion: number | null;
    origin: string;
    total_cost: number;             // USD
    cache_discount: number | null;  // negative = savings
    app_id: number | null;
    latency: number | null;         // ms
    moderation_latency: number | null;
    finish_reason: string | null;
    native_finish_reason: string | null;
    provider_name: string;
    usage: number;                  // USD (same as total_cost basically)
  };
}

// API error shape
export interface OpenRouterError {
  error: {
    code: number;
    message: string;
  };
}
