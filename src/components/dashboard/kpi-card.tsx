"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number;
  delta?: number; // % change vs previous period
  format: "number" | "currency" | "percent" | "latency";
  icon: LucideIcon;
  loading?: boolean;
  deltaInverted?: boolean; // when true, positive delta = bad (costs, errors)
  alertThreshold?: number; // highlight red when value exceeds this
}

function formatValue(value: number, format: KpiCardProps["format"]): string {
  switch (format) {
    case "currency":
      return value < 0.01
        ? `$${(value * 1000).toFixed(2)}m` // millicents
        : value < 1
        ? `$${value.toFixed(4)}`
        : value < 100
        ? `$${value.toFixed(2)}`
        : `$${value.toFixed(0)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "latency":
      return value >= 1000
        ? `${(value / 1000).toFixed(2)}s`
        : `${Math.round(value)}ms`;
    case "number":
    default:
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : value.toLocaleString();
  }
}

export function KpiCard({
  title,
  value,
  delta,
  format,
  icon: Icon,
  loading = false,
  deltaInverted = false,
  alertThreshold,
}: KpiCardProps) {
  const isAlert = alertThreshold !== undefined && value > alertThreshold;

  // Determine if the delta is "good" or "bad"
  const isPositiveDelta = delta !== undefined && delta > 0;
  const isGoodDelta = deltaInverted ? !isPositiveDelta : isPositiveDelta;

  const deltaColor =
    delta === undefined || Math.abs(delta) < 0.1
      ? "text-muted-foreground"
      : isGoodDelta
      ? "text-emerald-500"
      : "text-red-500";

  const DeltaIcon =
    delta === undefined || Math.abs(delta) < 0.1
      ? Minus
      : isPositiveDelta
      ? TrendingUp
      : TrendingDown;

  return (
    <Card className={cn("relative overflow-hidden", isAlert && "border-red-500/50")}>
      {isAlert && (
        <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isAlert ? "bg-red-500/10" : "bg-primary/10"
          )}
        >
          <Icon
            className={cn("w-4 h-4", isAlert ? "text-red-500" : "text-primary")}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight",
                isAlert && "text-red-500"
              )}
            >
              {formatValue(value, format)}
            </p>
            {delta !== undefined && (
              <div className={cn("flex items-center gap-1 mt-1", deltaColor)}>
                <DeltaIcon className="w-3 h-3" />
                <span className="text-xs">
                  {Math.abs(delta).toFixed(1)}% vs prev period
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
