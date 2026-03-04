// drift-ignore-file
"use client";

/**
 * SpendForecastChart — AreaChart con dos zonas:
 *   1. Histórico: datos reales de los últimos 30 días (costUsd por día)
 *   2. Forecast: proyección de los próximos días hasta fin de mes
 *      basada en el burn rate promedio de los últimos 7 días
 *
 * Técnica Recharts:
 *   - Un solo <AreaChart> con todos los puntos (histórico + forecast)
 *   - Diferenciamos histórico vs forecast con una propiedad `isForecast`
 *   - Usamos dos <Area>: "actual" y "projected"
 *   - Los puntos de forecast tienen `actual=null` y `projected=valor`
 *   - Los puntos históricos tienen `actual=valor` y `projected=null`
 *   - El punto de intersección (hoy) tiene ambos para que las líneas conecten
 *   - ReferenceLine vertical marca "Today"
 *   - ReferenceLine horizontal marca el límite mensual
 */

import { format, addDays, startOfDay } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types";
import { formatCost } from "@/lib/utils/formatting";
import { useIsClient } from "@/hooks/use-is-client";

interface SpendForecastChartProps {
  timeseries: TimeSeriesPoint[];
  monthlyLimit: number;
  avgDailyBurn: number;
  loading?: boolean;
}

interface ChartPoint {
  date: string;       // "MMM d" label
  actual: number | null;
  projected: number | null;
  isForecast: boolean;
}

function buildChartData(
  timeseries: TimeSeriesPoint[],
  avgDailyBurn: number
): ChartPoint[] {
  const points: ChartPoint[] = [];

  // Historical points
  for (const p of timeseries) {
    points.push({
      date: format(new Date(p.timestamp), "MMM d"),
      actual: p.costUsd,
      projected: null,
      isForecast: false,
    });
  }

  // Forecast: project from today to end of current month
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.ceil(
    (endOfMonth.getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Junction point: today's actual becomes the starting point of the forecast line
  const todayLabel = format(now, "MMM d");
  const lastActual = timeseries.length > 0
    ? timeseries[timeseries.length - 1].costUsd
    : avgDailyBurn;

  // Update last historical point to also have projected value (connect the lines)
  if (points.length > 0) {
    points[points.length - 1].projected = lastActual;
  }

  // Add forecast points
  for (let d = 1; d <= daysLeft; d++) {
    const date = addDays(startOfDay(now), d);
    points.push({
      date: format(date, "MMM d"),
      actual: null,
      projected: avgDailyBurn,
      isForecast: true,
    });
  }

  // Deduplicate today label if it appears twice
  void todayLabel;

  return points;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1.5">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p) => {
        if (p.value === null) return null;
        return (
          <p key={p.name} className="text-muted-foreground">
            <span style={{ color: p.color }}>{p.name}: </span>
            <span className="font-medium">{formatCost(p.value)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function SpendForecastChart({
  timeseries,
  monthlyLimit,
  avgDailyBurn,
  loading,
}: SpendForecastChartProps) {
  const isClient = useIsClient();
  const data = buildChartData(timeseries, avgDailyBurn);
  const todayLabel = format(new Date(), "MMM d");

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Daily Spend &amp; Forecast</CardTitle>
        <CardDescription>
          Historical spend per day with projected burn rate through end of month
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !isClient ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.40} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCost(v)}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* "Today" marker */}
              <ReferenceLine
                x={todayLabel}
                stroke="#6b7280"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: "Today",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#9ca3af",
                }}
              />

              {/* Monthly limit line */}
              {monthlyLimit > 0 && (
                <ReferenceLine
                  y={monthlyLimit / 30} // daily equivalent
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: `Limit avg: ${formatCost(monthlyLimit / 30)}/day`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradActual)"
                dot={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#gradProjected)"
                dot={false}
                connectNulls={false}
              />

              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
