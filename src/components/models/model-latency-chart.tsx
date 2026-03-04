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
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ModelStats } from "@/types";
import { getProviderConfig, formatLatency } from "@/lib/utils/formatting";
import { useIsClient } from "@/hooks/use-is-client";

interface ModelLatencyChartProps {
  models: ModelStats[];
  loading?: boolean;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ModelStats }>;
}) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  const provider = getProviderConfig(m.provider);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
        <span className="font-medium">{m.model}</span>
      </div>
      <p className="text-muted-foreground">
        Avg: <span className="text-amber-400 font-semibold">{formatLatency(m.avgLatencyMs)}</span>
      </p>
      <p className="text-muted-foreground">
        P95: <span className="text-foreground font-medium">{formatLatency(m.p95LatencyMs)}</span>
      </p>
    </div>
  );
}

export function ModelLatencyChart({ models, loading }: ModelLatencyChartProps) {
  const isClient = useIsClient();
  const data = [...models].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
  const avg =
    models.length > 0
      ? models.reduce((s, m) => s + m.avgLatencyMs, 0) / models.length
      : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Latency Comparison</CardTitle>
        <CardDescription>Avg and P95 response time per model</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="model"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />

              {/* Reference line: average across selected models */}
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: `avg ${formatLatency(avg)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#f59e0b",
                  }}
                />
              )}

              <Bar dataKey="avgLatencyMs" name="Avg" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {data.map((entry) => (
                  <Cell
                    key={entry.model}
                    fill={getProviderConfig(entry.provider).color}
                    fillOpacity={0.85}
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
