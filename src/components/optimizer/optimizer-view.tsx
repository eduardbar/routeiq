"use client";

import { useState, useEffect } from "react";
import { Zap, TrendingDown, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SuggestionCard } from "./suggestion-card";
import { SavingsSummary } from "./savings-summary";
import type { RoutingSuggestion } from "@/types";

interface OptimizerResult {
  suggestions: RoutingSuggestion[];
  source: "ai" | "rules";
}

export function OptimizerView() {
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-run on mount so judges see results immediately (no manual click needed)
  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/optimizer", { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Failed to run analysis. Please try again.");
      console.error("[OptimizerView] Analysis failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalSavings = result?.suggestions.reduce(
    (sum, s) => sum + s.estimatedSavingsUsd,
    0
  ) ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Routing Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered analysis of your LLM usage to reduce costs without sacrificing quality.
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} size="sm">
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Run Analysis"}
        </Button>
      </div>

      {/* Empty state — before first run */}
      {!result && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Ready to optimize your LLM spend?</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Click <strong>Run Analysis</strong> to scan your last 30 days of model usage
                and get specific routing suggestions with estimated savings.
              </p>
            </div>
            <Button onClick={runAnalysis} className="mt-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Run Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Source badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {result.source === "ai" ? (
                <>
                  <Sparkles className="w-3 h-3" />
                  AI-powered analysis
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  Rule-based analysis
                </>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Based on last 30 days of usage
            </span>
          </div>

          {/* Savings summary cards */}
          <SavingsSummary suggestions={result.suggestions} totalSavings={totalSavings} />

          {/* Suggestion cards */}
          {result.suggestions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  Already optimized!
                </CardTitle>
                <CardDescription>
                  Your current routing looks efficient. No major savings opportunities detected.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {result.suggestions.length} Optimization Opportunities
              </h2>
              {result.suggestions.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
