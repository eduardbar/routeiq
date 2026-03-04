// drift-ignore-file
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModelStats } from "@/types";
import { formatLatency } from "@/lib/utils/formatting";
import { useIsClient } from "@/hooks/use-is-client";

interface ModelP95ChartProps {
  models: ModelStats[];
  loading?: boolean;
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const avg = payload.find((p) => p.dataKey === "avgLatencyMs");
  const p95 = payload.find((p) => p.dataKey === "p95LatencyMs");
  const spread = avg && p95 ? (p95.value / avg.value).toFixed(1) : null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-2 min-w-[160px]">
      <p className="font-semibold text-foreground truncate max-w-[180px]">{label}</p>
      <div className="space-y-1">
        {avg && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-[#6366f1] inline-block" />
              Avg
            </span>
            <span className="font-mono font-medium text-[#6366f1]">
              {formatLatency(avg.value)}
            </span>
          </div>
        )}
        {p95 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />
              P95
            </span>
            <span className="font-mono font-medium text-[#f59e0b]">
              {formatLatency(p95.value)}
            </span>
          </div>
        )}
        {spread && (
          <div className="pt-1 border-t border-border/40 flex items-center justify-between">
            <span className="text-muted-foreground">Spread</span>
            <span
              className={`font-semibold ${
                parseFloat(spread) >= 3
                  ? "text-red-400"
                  : parseFloat(spread) >= 2
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {spread}× tail
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Spread badge ────────────────────────────────────────────────────────────

function worstSpread(models: ModelStats[]): { model: string; ratio: number } | null {
  if (!models.length) return null;
  const worst = [...models].sort(
    (a, b) => b.p95LatencyMs / b.avgLatencyMs - a.p95LatencyMs / a.avgLatencyMs
  )[0];
  return { model: worst.model, ratio: worst.p95LatencyMs / worst.avgLatencyMs };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ModelP95Chart({ models, loading }: ModelP95ChartProps) {
  const isClient = useIsClient();
  const data = [...models].sort((a, b) => a.p95LatencyMs - b.p95LatencyMs);
  const worst = worstSpread(models);

  // P95 average reference line
  const p95Avg =
    models.length > 0
      ? models.reduce((s, m) => s + m.p95LatencyMs, 0) / models.length
      : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">P95 Latency Distribution</CardTitle>
            <CardDescription>
              Average vs tail latency per model — high spread means unpredictable responses
            </CardDescription>
          </div>
          {worst && worst.ratio >= 2 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap"
            >
              {worst.ratio.toFixed(1)}× spread on {worst.model.split("/").pop()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : models.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Select at least one model to display chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
              barCategoryGap="25%"
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                vertical={false}
              />
              <XAxis
                dataKey="model"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => {
                  // strip provider prefix: "openai/gpt-4o" → "gpt-4o"
                  const parts = v.split("/");
                  const name = parts[parts.length - 1];
                  return name.length > 14 ? name.slice(0, 13) + "…" : name;
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}ms`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#1f2937", opacity: 0.5 }}
              />
              <Legend
                iconType="square"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-[10px] text-muted-foreground">
                    {value === "avgLatencyMs" ? "Avg latency" : "P95 latency"}
                  </span>
                )}
              />

              {/* P95 fleet-wide reference line */}
              {p95Avg > 0 && (
                <ReferenceLine
                  y={p95Avg}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: `P95 avg ${formatLatency(p95Avg)}`,
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "#f59e0b",
                  }}
                />
              )}

              <Bar
                dataKey="avgLatencyMs"
                name="avgLatencyMs"
                fill="#6366f1"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="p95LatencyMs"
                name="p95LatencyMs"
                fill="#f59e0b"
                fillOpacity={0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Spread legend */}
        {!loading && isClient && models.length > 0 && (
          <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/40 pt-3">
            <span className="font-medium text-foreground">Tail spread:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              &lt;2× Good
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              2–3× Watch
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              &gt;3× Critical
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
