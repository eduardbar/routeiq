// drift-ignore-file
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types";
import { useIsClient } from "@/hooks/use-is-client";

interface LatencyChartProps {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ms = payload[0].value;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="font-medium">{label ? format(parseISO(label), "MMM d") : ""}</p>
      <p className="text-amber-400 font-semibold">
        {ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`}
      </p>
    </div>
  );
}

export function LatencyChart({ data, loading }: LatencyChartProps) {
  const isClient = useIsClient();
  // Compute average for reference line
  const avg =
    data.length > 0
      ? data.reduce((s, d) => s + d.avgLatencyMs, 0) / data.length
      : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Avg Latency</CardTitle>
            <CardDescription>Response time across all models (ms)</CardDescription>
          </div>
          {avg > 0 && (
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Period avg:{" "}
              <span className="text-amber-400 font-semibold">
                {avg >= 1000 ? `${(avg / 1000).toFixed(2)}s` : `${Math.round(avg)}ms`}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-40 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            {/* LineChart: ideal para tendencias continuas */}
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(val) => {
                  try {
                    return format(parseISO(val), "MMM d");
                  } catch {
                    return val;
                  }
                }}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* ReferenceLine: línea horizontal de referencia (el promedio) */}
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              )}

              <Line
                type="monotone"
                dataKey="avgLatencyMs"
                name="Latency"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
