# RouteIQ — LLM Observability Dashboard

> **The Grafana for your LLM infrastructure.** Real-time cost tracking, model comparison, request log explorer, and AI-powered routing optimization — built for engineering teams that care about what their LLMs are actually doing.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4.x-black?logo=vercel)](https://sdk.vercel.ai)

---

## The Problem

LLM costs are invisible until it's too late.

Most teams discover they're burning money on `gpt-4o` for tasks that `gpt-4o-mini` handles equally well — **after** they get the invoice. There's no visibility into which models are slow, which have high error rates, or when you're about to blow your monthly budget.

RouteIQ solves this with a single dashboard that answers:
- **What** are we spending, and on what?
- **Which** models are underperforming vs. their cost?
- **When** will we hit our budget limit?
- **What** should we change to save money without hurting quality?

---

## Features

### 📊 Overview Dashboard
KPI cards with delta indicators vs. previous period — total requests, cost, avg latency, error rate, cache hit rate, active models. Three time-series charts (request volume, daily cost, latency trend) plus a summary stats panel. Date range picker: 24h / 7d / 30d.

### 🤖 Model Comparison
Side-by-side stats table for every model with sortable columns (cost, latency, P95, success rate, cache hit rate). Multi-select radar chart for normalized multi-dimension comparison across 5 axes: Volume, Cost Efficiency, Speed, Reliability, Cache Efficiency.

### 🔍 Request Log Explorer
Filterable, paginated log table — filter by model, status (success/error/cached), date range. Click any row for a full detail sheet: token breakdown (prompt vs. completion), cost, latency, cache status, API key alias.

### 💰 Budget & Cost Forecasting
Gauge cards for daily and monthly spend with severity color-coding (green → amber → red). Area chart with historical spend + projected burn rate through end of month. Configurable budget alert banner.

### ⚡ Routing Optimizer
AI-powered analysis (Vercel AI SDK + GPT-4o-mini) that scans your request patterns and identifies:
- Models being used for tasks where cheaper alternatives perform equally well
- Estimated monthly savings per suggestion
- Confidence score and reasoning for each recommendation

Falls back to rule-based heuristics when no AI key is configured.

### ⚙️ Settings
Live connection status indicator per data source. Step-by-step env var configuration guide with inline code examples.

---

## Architecture

### The Adapter Pattern — Core Abstraction

RouteIQ's entire data layer is built around a single interface contract. Every component, every API route, every chart talks to `IDataAdapter` — never to a specific provider directly.

```typescript
// src/types/index.ts
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
```

Three implementations today — the same code works with all three:

```
┌─────────────────────────────────────────────────────┐
│                  Next.js App Router                  │
│   /overview  /models  /logs  /budget  /optimizer    │
└─────────────────────┬───────────────────────────────┘
                      │  fetch("/api/...")
┌─────────────────────▼───────────────────────────────┐
│              API Routes  (server-side)               │
│  /api/overview   /api/timeseries   /api/models      │
│  /api/logs       /api/budget       /api/optimizer   │
└─────────────────────┬───────────────────────────────┘
                      │  getAdapter()
┌─────────────────────▼───────────────────────────────┐
│              IDataAdapter  (interface)               │
│  getOverviewStats()    getTimeSeries()              │
│  getModelStats()       getRequestLogs()             │
│  getBudgetStatus()                                  │
└──────────┬──────────────────┬───────────────────────┘
           │                  │                │
    MockAdapter        OpenRouterAdapter   LiteLLMAdapter
    (seeded, no key)   (real API)          (plug-in ready)
```

**Why this matters:** Adding a new data source (LiteLLM, Helicone, Langfuse) requires implementing one interface — no changes to UI, API routes, or business logic. This is O(1) complexity for new integrations.

### Adapter Factory — Zero-Config Switching

```typescript
// src/lib/adapter-factory.ts
export function getAdapter(): IDataAdapter {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

  switch (source) {
    case "openrouter": return new OpenRouterAdapter(process.env.OPENROUTER_API_KEY);
    case "litellm":    return new LiteLLMAdapter(/* ... */);
    default:           return new MockAdapter();
  }
}
```

Switching from demo to production is **one env var change**. No code changes. No redeployment of logic.

### Mock Data Engine — Deterministic by Design

The mock adapter generates 30 days of realistic LLM traffic using a seeded PRNG. The seed is fixed, so every page reload, every judge demo shows the **same** numbers. No random jumps, no charts that look different on second load.

```
7 models × 5 providers × 30 days × hourly granularity
→ ~5,000 synthetic request logs
→ Realistic cost distributions (gpt-4o ~10× more expensive than gpt-4o-mini)
→ Latency curves with variance (p95 ≈ 2× avg)
→ Error spikes and cache hit patterns
```

### Request Pipeline

```
User navigates to /overview
  → Client component mounts, fetches /api/overview?from=...&to=...
  → API route calls getAdapter().getOverviewStats(from, to)
  → Adapter transforms raw data → OverviewStats domain type
  → Component receives typed response, renders KPI cards
```

Every layer is typed end-to-end. The `OverviewStats` type is the single source of truth — if a field doesn't exist in the type, it can't be used anywhere in the UI.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Server components, API routes, streaming — one repo |
| Language | TypeScript (strict mode) | End-to-end type safety across adapter ↔ API ↔ UI |
| UI Components | shadcn/ui + Radix UI | Accessible, unstyled primitives — no fighting CSS |
| Styling | Tailwind CSS v4 | Utility-first, co-located styles, dark mode built-in |
| Charts | Recharts | React-native, composable, good SSR story |
| AI | Vercel AI SDK + `gpt-4o-mini` | Streaming, structured output, provider-agnostic |
| Data | Adapter Pattern | Pluggable: Mock → OpenRouter → LiteLLM → anything |
| Dates | date-fns | Tree-shakable, no moment.js debt |
| Icons | lucide-react | Consistent, MIT-licensed |

---

## Getting Started

```bash
git clone https://github.com/yourusername/routeiq
cd routeiq
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the demo runs fully on mock data, no API keys required.

### Environment Variables

```env
# .env.local

# Data source: "mock" | "openrouter" | "litellm"
NEXT_PUBLIC_DATA_SOURCE=mock

# Required when DATA_SOURCE=openrouter
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: enables AI-powered Routing Optimizer
# Works with OpenAI key or OpenRouter key
OPENAI_API_KEY=sk-...

# Required when DATA_SOURCE=litellm
LITELLM_BASE_URL=http://localhost:4000
LITELLM_MASTER_KEY=sk-...
```

### With Real OpenRouter Data

```env
NEXT_PUBLIC_DATA_SOURCE=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
```

The app will fetch your actual LLM usage from the OpenRouter API. If the key is missing or invalid, it gracefully falls back to mock data with a warning in the console.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── overview/           # GET /api/overview?from&to
│   │   ├── timeseries/         # GET /api/timeseries?from&to&granularity
│   │   ├── models/             # GET /api/models?from&to
│   │   ├── logs/               # GET /api/logs?from&to&limit&offset&model&status
│   │   ├── budget/             # GET /api/budget
│   │   ├── optimizer/          # POST /api/optimizer (AI analysis)
│   │   └── config/             # GET /api/config (active data source)
│   ├── overview/               # Overview Dashboard page
│   ├── models/                 # Model Comparison page
│   ├── logs/                   # Request Log Explorer page
│   ├── budget/                 # Budget & Forecasting page
│   ├── optimizer/              # Routing Optimizer page
│   └── settings/               # Settings page
├── components/
│   ├── dashboard/              # Overview charts + KPI cards
│   ├── models/                 # Model comparison charts + table
│   ├── logs/                   # Log table + detail sheet
│   ├── budget/                 # Gauge cards + forecast chart
│   ├── optimizer/              # Suggestion cards
│   ├── settings/               # Settings view + connection status
│   └── layout/                 # Sidebar + app shell
├── hooks/
│   └── use-is-client.ts        # SSR-safe Recharts guard
├── lib/
│   ├── adapter-factory.ts      # Single source: which adapter is active
│   ├── config.ts               # Env var parsing + validation
│   ├── mock/
│   │   ├── generator.ts        # Seeded PRNG mock data engine
│   │   └── adapter.ts          # MockAdapter implements IDataAdapter
│   ├── openrouter/
│   │   ├── adapter.ts          # OpenRouterAdapter implements IDataAdapter
│   │   └── types.ts            # Raw OpenRouter API response types
│   └── utils/
│       └── formatting.ts       # formatCost(), formatLatency(), etc.
└── types/
    └── index.ts                # Domain types + IDataAdapter interface
```

---

## Design Decisions

**Why Adapter Pattern instead of direct API calls?**
Because the problem isn't building a dashboard for OpenRouter — it's building a dashboard for *any* LLM proxy. LiteLLM, Helicone, Langfuse, custom internal proxies — all can be supported by implementing one interface. The UI never needs to know where the data comes from.

**Why mock data instead of a real backend?**
The demo needs to work without API keys, without a database, without a running proxy server. The seeded mock engine gives judges a fully populated, realistic experience that looks identical on every load. Switching to real data is one env var.

**Why Next.js API routes instead of a separate backend?**
For a dashboard of this scope, the overhead of a separate service (CORS, auth, deployment, cold starts) isn't worth it. Next.js server-side API routes run at the edge, co-locate with the UI, and deploy as one unit. Clean separation is maintained through the adapter interface, not network boundaries.

**Why `useIsClient` for Recharts?**
Recharts' `ResponsiveContainer` uses `ResizeObserver` to measure the DOM. During SSR hydration, the DOM doesn't have dimensions yet — this causes `width=-1 / height=-1` warnings in the console. Gating chart render behind `useIsClient` ensures charts only mount after the container has real dimensions, eliminating the warnings without sacrificing the loading skeleton UX.

---

## Roadmap

- [ ] **LiteLLM Adapter** — direct integration with self-hosted LiteLLM proxy
- [ ] **Alert system** — email/Slack notifications when budget thresholds are crossed
- [ ] **Custom routing rules** — UI to configure which models handle which request patterns
- [ ] **Multi-workspace support** — separate views per team/project
- [ ] **Export** — CSV download for request logs and cost reports

---

## Built For

**Nexora Hacks 2026** — *"The Grafana for your LLM infrastructure."*

RouteIQ is designed to complement tools like LiteLLM, not replace them. LiteLLM is a world-class routing proxy — RouteIQ is the observability layer it deserves.

---

*MIT License — built by Eduard Barrera*
