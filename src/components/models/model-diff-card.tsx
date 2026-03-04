"use client";

import type { ModelStats } from "@/types";
import {
  formatCost,
  formatLatency,
  formatPercent,
  formatNumber,
  getProviderConfig,
} from "@/lib/utils/formatting";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelDiffCardProps {
  modelA: ModelStats;
  modelB: ModelStats;
}

type MetricDirection = "lower-better" | "higher-better";

interface MetricRow {
  label: string;
  direction: MetricDirection;
  valueA: number;
  valueB: number;
  format: (n: number) => string;
}

function DeltaIndicator({
  valueA,
  valueB,
  direction,
}: {
  valueA: number;
  valueB: number;
  direction: MetricDirection;
}) {
  if (valueA === valueB) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-xs font-medium">
        <Minus className="w-3 h-3" />
        <span>—</span>
      </span>
    );
  }

  const bIsHigher = valueB > valueA;
  // "better" for B:
  //   lower-better: B is better when valueB < valueA → bIsHigher = false
  //   higher-better: B is better when valueB > valueA → bIsHigher = true
  const bIsBetter =
    direction === "lower-better" ? !bIsHigher : bIsHigher;

  const pctDiff =
    valueA !== 0 ? Math.abs(((valueB - valueA) / valueA) * 100) : 0;

  const color = bIsBetter ? "text-emerald-500" : "text-red-500";

  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", color)}>
      {bIsHigher ? (
        <ArrowUp className="w-3 h-3 shrink-0" />
      ) : (
        <ArrowDown className="w-3 h-3 shrink-0" />
      )}
      <span>{pctDiff < 0.1 ? "<0.1" : pctDiff.toFixed(1)}%</span>
    </span>
  );
}

export function ModelDiffCard({ modelA, modelB }: ModelDiffCardProps) {
  const providerA = getProviderConfig(modelA.provider);
  const providerB = getProviderConfig(modelB.provider);

  const metrics: MetricRow[] = [
    {
      label: "Requests",
      direction: "higher-better",
      valueA: modelA.totalRequests,
      valueB: modelB.totalRequests,
      format: formatNumber,
    },
    {
      label: "Total Cost",
      direction: "lower-better",
      valueA: modelA.totalCostUsd,
      valueB: modelB.totalCostUsd,
      format: formatCost,
    },
    {
      label: "Avg Cost / Req",
      direction: "lower-better",
      valueA: modelA.avgCostPerRequest,
      valueB: modelB.avgCostPerRequest,
      format: formatCost,
    },
    {
      label: "Avg Latency",
      direction: "lower-better",
      valueA: modelA.avgLatencyMs,
      valueB: modelB.avgLatencyMs,
      format: formatLatency,
    },
    {
      label: "P95 Latency",
      direction: "lower-better",
      valueA: modelA.p95LatencyMs,
      valueB: modelB.p95LatencyMs,
      format: formatLatency,
    },
    {
      label: "Success Rate",
      direction: "higher-better",
      valueA: modelA.successRate,
      valueB: modelB.successRate,
      format: formatPercent,
    },
    {
      label: "Cache Hit Rate",
      direction: "higher-better",
      valueA: modelA.cacheHitRate,
      valueB: modelB.cacheHitRate,
      format: formatPercent,
    },
    {
      label: "Token Efficiency",
      direction: "higher-better",
      valueA: modelA.tokenEfficiency,
      valueB: modelB.tokenEfficiency,
      format: formatPercent,
    },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="text-sm font-semibold">Model Diff:</span>
        <span
          className="text-sm font-medium"
          style={{ color: providerA.color }}
        >
          {modelA.model}
        </span>
        <span className="text-xs text-muted-foreground">vs</span>
        <span
          className="text-sm font-medium"
          style={{ color: providerB.color }}
        >
          {modelB.model}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_56px_1fr] gap-0 px-4 py-2 border-b border-border bg-muted/10 text-xs text-muted-foreground font-medium">
        <span>Metric</span>
        <span
          className="text-right truncate pr-4"
          style={{ color: providerA.color }}
        >
          {modelA.model}
        </span>
        <span className="text-center">Δ</span>
        <span
          className="text-right truncate"
          style={{ color: providerB.color }}
        >
          {modelB.model}
        </span>
      </div>

      {/* Metric rows */}
      <div className="divide-y divide-border">
        {metrics.map((metric) => {
          const bIsHigher = metric.valueB > metric.valueA;
          const bIsBetter =
            metric.direction === "lower-better"
              ? metric.valueB < metric.valueA
              : bIsHigher;
          const aIsBetter =
            metric.direction === "lower-better"
              ? metric.valueA < metric.valueB
              : metric.valueA > metric.valueB;

          return (
            <div
              key={metric.label}
              className="grid grid-cols-[1fr_1fr_56px_1fr] gap-0 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors"
            >
              {/* Metric name */}
              <span className="text-sm text-muted-foreground">
                {metric.label}
              </span>

              {/* Model A value */}
              <span
                className={cn(
                  "text-sm tabular-nums font-medium text-right pr-4",
                  aIsBetter
                    ? "text-emerald-500"
                    : metric.valueA === metric.valueB
                    ? "text-foreground"
                    : "text-red-500"
                )}
              >
                {metric.format(metric.valueA)}
              </span>

              {/* Delta indicator */}
              <div className="flex items-center justify-center">
                <DeltaIndicator
                  valueA={metric.valueA}
                  valueB={metric.valueB}
                  direction={metric.direction}
                />
              </div>

              {/* Model B value */}
              <span
                className={cn(
                  "text-sm tabular-nums font-medium text-right",
                  bIsBetter
                    ? "text-emerald-500"
                    : metric.valueA === metric.valueB
                    ? "text-foreground"
                    : "text-red-500"
                )}
              >
                {metric.format(metric.valueB)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
