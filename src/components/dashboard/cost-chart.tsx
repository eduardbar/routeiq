// drift-ignore-file
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types";
import { useIsClient } from "@/hooks/use-is-client";

interface CostChartProps {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

// A day is an anomaly if its cost is > ANOMALY_MULTIPLIER × the mean
const ANOMALY_MULTIPLIER = 2;

function computeAnomalies(data: TimeSeriesPoint[]): Set<string> {
  const nonZero = data.filter((d) => d.costUsd > 0);
  if (nonZero.length === 0) return new Set();
  const mean = nonZero.reduce((s, d) => s + d.costUsd, 0) / nonZero.length;
  const threshold = mean * ANOMALY_MULTIPLIER;
  return new Set(data.filter((d) => d.costUsd > threshold).map((d) => d.timestamp));
}

function CustomTooltip({
  active,
  payload,
  label,
  anomalies,
  mean,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  anomalies: Set<string>;
  mean: number;
}) {
  if (!active || !payload?.length) return null;
  const cost = payload[0].value;
  const isAnomaly = label ? anomalies.has(label) : false;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1.5 min-w-40">
      <p className="font-medium">{label ? format(parseISO(label), "MMM d, yyyy") : ""}</p>
      <p className={isAnomaly ? "text-red-400 font-bold" : "text-emerald-500 font-semibold"}>
        ${cost < 0.01 ? cost.toFixed(5) : cost.toFixed(4)}
      </p>
      {isAnomaly && mean > 0 && (
        <div className="border-t border-border pt-1.5 space-y-0.5">
          <p className="text-red-400 font-semibold flex items-center gap-1">
            ⚠ Cost Anomaly
          </p>
          <p className="text-muted-foreground">
            {(cost / mean).toFixed(1)}× above average (${mean.toFixed(4)}/day)
          </p>
        </div>
      )}
    </div>
  );
}

export function CostChart({ data, loading }: CostChartProps) {
  const isClient = useIsClient();

  const anomalies = computeAnomalies(data);
  const nonZero = data.filter((d) => d.costUsd > 0);
  const mean = nonZero.length > 0
    ? nonZero.reduce((s, d) => s + d.costUsd, 0) / nonZero.length
    : 0;
  const anomalyCount = anomalies.size;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Daily Cost (USD)</CardTitle>
            <CardDescription>LLM spend per day across all models</CardDescription>
          </div>
          {anomalyCount > 0 && (
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
              {anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(val) => {
                  try {
                    return format(parseISO(val), "MMM d");
                  } catch {
                    return val;
                  }
                }}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(2)}`}
              />
              <Tooltip
                content={<CustomTooltip anomalies={anomalies} mean={mean} />}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar dataKey="costUsd" name="Cost" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((entry) => (
                  <Cell
                    key={entry.timestamp}
                    fill={anomalies.has(entry.timestamp) ? "#ef4444" : "#10b981"}
                    opacity={anomalies.has(entry.timestamp) ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
