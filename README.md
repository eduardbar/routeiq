# RouteIQ — LLM Observability Dashboard

> **The Grafana for your LLM infrastructure.** Real-time cost tracking, model comparison, request log explorer, and AI-powered routing optimization — all in one dashboard.

## What it does

RouteIQ gives engineering teams full visibility into their LLM usage:

- **Overview Dashboard** — KPI cards (requests, cost, latency, error rate) with time-series charts and date range filtering
- **Model Comparison** — side-by-side stats for every model: cost, latency, P95, success rate, cache hit rate, radar chart
- **Request Log Explorer** — filterable, paginated table of every LLM call with full detail sheet (tokens, cost, latency, status)
- **Cost & Budget** — gauge cards for daily/monthly spend, burn rate forecast, configurable budget alerts
- **Routing Optimizer** — AI-powered analysis (via Vercel AI SDK + GPT-4o-mini) that detects which models can be replaced with cheaper alternatives for specific task types, with estimated monthly savings
- **Settings** — live connection status, env var configuration guide for OpenRouter and LiteLLM

## Why it matters

LLM costs are opaque. Most teams have no idea:
- Which models they're actually using at scale
- Whether `gpt-4o` is overkill for 80% of their requests
- When they're about to blow their monthly budget

RouteIQ answers all of that — and proactively tells you what to do about it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Charts | Recharts |
| AI | Vercel AI SDK + OpenAI `gpt-4o-mini` |
| Data | Adapter Pattern: Mock / OpenRouter / LiteLLM |

## Architecture

RouteIQ uses an **Adapter Pattern** as its core abstraction:

```
┌─────────────────────────────────────────┐
│              Next.js App Router         │
│  /overview  /models  /logs  /budget     │
│  /optimizer  /settings                  │
└──────────────┬──────────────────────────┘
               │ fetch("/api/...")
┌──────────────▼──────────────────────────┐
│           API Routes (server-side)       │
│  /api/overview  /api/models  /api/logs  │
│  /api/budget  /api/optimizer /api/config│
└──────────────┬──────────────────────────┘
               │ getAdapter()
┌──────────────▼──────────────────────────┐
│         IDataAdapter interface           │
│  getOverviewStats()  getTimeSeries()    │
│  getModelStats()     getRequestLogs()   │
│  getBudgetStatus()                      │
└──────┬──────────────┬───────────────────┘
       │              │              │
  MockAdapter  OpenRouterAdapter  LiteLLMAdapter
  (seeded)     (real API)         (coming soon)
```

Every component talks to the same interface. Switching from mock data to real OpenRouter data is a single env var change.

## Getting Started

```bash
git clone https://github.com/yourusername/routeiq
cd routeiq
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### With real OpenRouter data

```env
# .env.local
NEXT_PUBLIC_DATA_SOURCE=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
```

### With AI-powered optimizer

```env
# .env.local (add to existing)
OPENAI_API_KEY=sk-...
# OR your OpenRouter key works too (routes to gpt-4o-mini automatically)
```

## Demo

The app ships with a **seeded mock data engine** — every chart, table, and metric is populated with realistic LLM traffic data (deterministic, reproducible). No API keys required for the demo.

The mock includes:
- 7 models across 5 providers (OpenAI, Anthropic, Google, Meta, Mistral)
- 30 days of hourly request data
- Realistic cost distributions and latency curves
- Error spikes and cache hit patterns

## Hackathon

Built for **Nexora Hacks 2026** by Eduardo.

---

*RouteIQ is designed to complement LiteLLM — it's the observability UI that LiteLLM's open-source proxy deserves.*
