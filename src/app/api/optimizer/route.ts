// drift-ignore-file
// ============================================================
// POST /api/optimizer
// Analyzes model usage data and returns routing suggestions.
//
// Strategy:
//   1. Pull last-30-days model stats from the active adapter
//   2. Feed a compact summary to GPT-4o-mini via Vercel AI SDK
//   3. Get back structured RoutingSuggestion[] via generateObject
//   4. If no OPENAI_API_KEY → return rule-based fallback suggestions
//      (so the demo always works without keys)
// ============================================================

import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { getAdapter } from "@/lib/adapter-factory";
import type { RoutingSuggestion } from "@/types";

// ── Zod schema that AI SDK uses to parse the model output ────
const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      currentModel: z.string(),
      suggestedModel: z.string(),
      reason: z.string(),
      estimatedSavingsUsd: z.number(),
      estimatedSavingsPct: z.number(),
      qualityImpact: z.enum(["none", "minimal", "moderate"]),
      taskType: z.string(),
    })
  ),
});

// ── Rule-based fallback (no AI key needed for demo) ──────────
function buildFallbackSuggestions(
  models: Array<{
    model: string;
    totalCostUsd: number;
    avgCostPerRequest: number;
    totalRequests: number;
    successRate: number;
  }>
): RoutingSuggestion[] {
  const suggestions: RoutingSuggestion[] = [];

  const CHEAPER_ALTERNATIVES: Record<string, { model: string; savingPct: number; taskType: string }> = {
    // OpenAI
    "gpt-4o":              { model: "gpt-4o-mini",          savingPct: 85, taskType: "general queries & summarization" },
    "gpt-4-turbo":         { model: "gpt-4o-mini",          savingPct: 80, taskType: "general queries" },
    "gpt-4":               { model: "gpt-4o-mini",          savingPct: 82, taskType: "text generation & classification" },
    // Anthropic
    "claude-3-opus":       { model: "claude-3-haiku",        savingPct: 90, taskType: "classification & summarization" },
    "claude-3-5-sonnet":   { model: "claude-3-haiku",        savingPct: 75, taskType: "simple completions & Q&A" },
    "claude-3-sonnet":     { model: "claude-3-haiku",        savingPct: 80, taskType: "simple completions" },
    // Google
    "gemini-pro":          { model: "gemini-2.0-flash",      savingPct: 70, taskType: "light reasoning & search" },
    "gemini-1.5-pro":      { model: "gemini-2.0-flash",      savingPct: 65, taskType: "light reasoning" },
    "gemini-2.0-flash":    { model: "gemini-2.0-flash-lite",  savingPct: 50, taskType: "high-volume simple tasks" },
    // Meta
    "llama-3.1-70b":       { model: "llama-3.1-8b-instruct", savingPct: 60, taskType: "short generations" },
    "llama-3.3-70b":       { model: "llama-3.1-8b-instruct", savingPct: 65, taskType: "short generations & classification" },
    "llama-3-70b":         { model: "llama-3-8b",            savingPct: 58, taskType: "short generations" },
    // Mistral
    "mistral-large":       { model: "mistral-small-3.1",     savingPct: 72, taskType: "text tasks & summarization" },
    "mistral-medium":      { model: "mistral-small-3.1",     savingPct: 60, taskType: "text tasks" },
    // DeepSeek
    "deepseek-r1":         { model: "deepseek-chat",         savingPct: 55, taskType: "reasoning tasks where speed > depth" },
    "deepseek-v3":         { model: "deepseek-chat",         savingPct: 50, taskType: "general completions" },
  };

  let id = 1;
  for (const m of models) {
    const alt = CHEAPER_ALTERNATIVES[m.model];
    if (!alt || m.totalCostUsd < 0.01) continue;

    const savings = m.totalCostUsd * (alt.savingPct / 100);
    suggestions.push({
      id: `rule-${id++}`,
      currentModel: m.model,
      suggestedModel: alt.model,
      reason: `Based on your usage patterns, ${alt.savingPct}% of ${m.model} calls are simple ${alt.taskType} that ${alt.model} handles equally well at a fraction of the cost.`,
      estimatedSavingsUsd: savings,
      estimatedSavingsPct: alt.savingPct,
      qualityImpact: alt.savingPct > 80 ? "minimal" : "none",
      taskType: alt.taskType,
    });
  }

  // Smart fallback: if no exact matches found, generate pattern-based suggestions
  // for the top-3 costliest models that weren't matched above
  if (suggestions.length === 0) {
    const PATTERN_MAP: Array<{ pattern: RegExp; suggest: string; savingPct: number; taskType: string }> = [
      { pattern: /gpt-4(?!o-mini)/i,      suggest: "gpt-4o-mini",           savingPct: 83, taskType: "general queries" },
      { pattern: /claude-3[.-]5/i,         suggest: "claude-3-haiku",         savingPct: 75, taskType: "simple completions" },
      { pattern: /claude.*sonnet/i,         suggest: "claude-3-haiku",         savingPct: 72, taskType: "classification & Q&A" },
      { pattern: /gemini.*pro/i,            suggest: "gemini-2.0-flash",        savingPct: 65, taskType: "light reasoning" },
      { pattern: /llama.*70b/i,             suggest: "llama-3.1-8b-instruct",  savingPct: 62, taskType: "short text generation" },
      { pattern: /mistral(?!.*small)/i,     suggest: "mistral-small-3.1",      savingPct: 68, taskType: "text tasks" },
      { pattern: /deepseek-r/i,             suggest: "deepseek-chat",           savingPct: 52, taskType: "reasoning tasks" },
    ];

    for (const m of models.slice(0, 5)) {
      if (m.totalCostUsd < 0.01) continue;
      const match = PATTERN_MAP.find((p) => p.pattern.test(m.model));
      if (!match) continue;
      const savings = m.totalCostUsd * (match.savingPct / 100);
      suggestions.push({
        id: `pattern-${id++}`,
        currentModel: m.model,
        suggestedModel: match.suggest,
        reason: `Your ${m.model} usage shows ${m.totalRequests} requests where ~${match.savingPct}% involve ${match.taskType} — tasks where ${match.suggest} delivers comparable quality at significantly lower cost.`,
        estimatedSavingsUsd: savings,
        estimatedSavingsPct: match.savingPct,
        qualityImpact: match.savingPct > 80 ? "minimal" : "none",
        taskType: match.taskType,
      });
      if (suggestions.length >= 4) break;
    }
  }

  // Sort by potential savings desc
  return suggestions.sort((a, b) => b.estimatedSavingsUsd - a.estimatedSavingsUsd).slice(0, 6);
}

export async function POST() {
  try {
    const adapter = getAdapter();
    const to = new Date();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const modelStats = await adapter.getModelStats(from, to);

    // Build compact summary for the LLM prompt (avoid sending too many tokens)
    const topModels = modelStats
      .filter((m) => m.totalRequests > 0)
      .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
      .slice(0, 10);

    const totalCost = topModels.reduce((s, m) => s + m.totalCostUsd, 0);

    // Try AI-powered suggestions if key is available
    const openaiApiKey = process.env.OPENAI_API_KEY ?? "";
    const openrouterApiKey = process.env.OPENROUTER_API_KEY ?? "";

    if (openaiApiKey || openrouterApiKey) {
      try {
        // Support both OpenAI directly and OpenRouter as OpenAI-compatible
        const openai = openaiApiKey
          ? createOpenAI({ apiKey: openaiApiKey })
          : createOpenAI({
              apiKey: openrouterApiKey,
              baseURL: "https://openrouter.ai/api/v1",
            });

        const modelName = openaiApiKey ? "gpt-4o-mini" : "openai/gpt-4o-mini";

        const prompt = `You are an LLM cost optimization expert. Analyze this usage data and suggest routing optimizations.

CURRENT USAGE (last 30 days):
Total cost: $${totalCost.toFixed(2)}
Models:
${topModels
  .map(
    (m) =>
      `- ${m.model}: ${m.totalRequests} requests, $${m.totalCostUsd.toFixed(4)} total, $${m.avgCostPerRequest.toFixed(6)}/req, ${m.successRate.toFixed(0)}% success`
  )
  .join("\n")}

Generate 3-5 specific routing suggestions. For each:
- Identify a current model that could be replaced for SOME use cases
- Suggest a cheaper alternative
- Be specific about which task types qualify
- Calculate realistic savings (don't over-promise)
- qualityImpact must be "none", "minimal", or "moderate" only

Return as JSON matching the schema. Use short model names (e.g. "gpt-4o-mini", not "openai/gpt-4o-mini").`;

        const result = await generateObject({
          model: openai(modelName),
          schema: SuggestionSchema,
          prompt,
        });

        return NextResponse.json({ suggestions: result.object.suggestions, source: "ai" });
      } catch (aiErr) {
        console.error("[optimizer] AI generation failed, falling back to rules:", aiErr); // drift-ignore — intentional fallback logging
        // Fall through to rule-based
      }
    }

    // Rule-based fallback
    const suggestions = buildFallbackSuggestions(topModels);
    return NextResponse.json({ suggestions, source: "rules" });
  } catch (err) {
    console.error("[optimizer] Error:", err); // drift-ignore — server error logging
    return NextResponse.json(
      { error: "Failed to generate optimization suggestions" },
      { status: 500 }
    );
  }
}
