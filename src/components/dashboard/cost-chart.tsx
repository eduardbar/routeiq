"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types";

interface CostChartProps {
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
  const cost = payload[0].value;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <p className="font-medium">{label ? format(parseISO(label), "MMM d") : ""}</p>
      <p className="text-emerald-500 font-semibold">
        ${cost < 0.01 ? cost.toFixed(5) : cost.toFixed(4)}
      </p>
    </div>
  );
}

export function CostChart({ data, loading }: CostChartProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Daily Cost (USD)</CardTitle>
        <CardDescription>LLM spend per day across all models</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            {/* BarChart: ideal para comparar valores por período */}
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar
                dataKey="costUsd"
                name="Cost"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
