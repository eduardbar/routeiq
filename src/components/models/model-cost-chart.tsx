// drift-ignore-file
"use client";

/**
 * ModelCostChart — BarChart horizontal
 *
 * Horizontal bars son ideales para comparar categorías con labels largos.
 * En Recharts, para que sea horizontal usás layout="vertical" en BarChart
 * y switcheás XAxis/YAxis: YAxis tiene el dataKey del label, XAxis la escala numérica.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ModelStats } from "@/types";
import { getProviderConfig, formatCost } from "@/lib/utils/formatting";
import { useIsClient } from "@/hooks/use-is-client";

interface ModelCostChartProps {
  models: ModelStats[];
  loading?: boolean;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ModelStats; value: number }>;
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
        Total: <span className="text-emerald-500 font-semibold">{formatCost(m.totalCostUsd)}</span>
      </p>
      <p className="text-muted-foreground">
        Per request:{" "}
        <span className="text-foreground font-medium">{formatCost(m.avgCostPerRequest)}</span>
      </p>
      <p className="text-muted-foreground">
        Requests: <span className="text-foreground font-medium">{m.totalRequests.toLocaleString()}</span>
      </p>
    </div>
  );
}

export function ModelCostChart({ models, loading }: ModelCostChartProps) {
  const isClient = useIsClient();
  const data = [...models].sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Cost by Model</CardTitle>
        <CardDescription>Total USD spend per model in period</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {/*
              layout="vertical" = barras horizontales
              YAxis recibe el label (model name)
              XAxis recibe la escala numérica
            */}
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCost(v)}
              />
              <YAxis
                type="category"
                dataKey="model"
                width={110}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="totalCostUsd" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {/* Cell: colorea cada barra con el color del provider */}
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
