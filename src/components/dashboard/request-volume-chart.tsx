"use client";

/**
 * RequestVolumeChart — Recharts tutorial en código real
 *
 * Recharts es React puro: cada componente es un elemento JSX.
 * El flujo es siempre:
 *   <ResponsiveContainer> — hace el chart responsive (width/height %)
 *     <AreaChart data={array}> — tipo de chart, recibe los datos
 *       <CartesianGrid> — la grilla de fondo
 *       <XAxis dataKey="campo"> — qué campo del objeto usar en X
 *       <YAxis> — escala del eje Y (automática)
 *       <Tooltip> — el popup al hacer hover
 *       <Area dataKey="campo"> — qué campo plotear, con área rellena
 *     </AreaChart>
 *   </ResponsiveContainer>
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/types";

interface RequestVolumeChartProps {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

// Custom tooltip para que se vea profesional
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1.5">
      <p className="font-medium text-foreground">
        {label ? format(parseISO(label), "MMM d, HH:mm") : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RequestVolumeChart({ data, loading }: RequestVolumeChartProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Request Volume</CardTitle>
        <CardDescription>Total requests over time</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              {/* Gradientes SVG para el área rellena */}
              <defs>
                <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

              {/* XAxis: formatea el timestamp ISO a "Dec 25" */}
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
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                )}
              />

              {/* Area: dataKey debe coincidir con la propiedad del objeto en `data` */}
              <Area
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#requestsGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1" }}
              />
              <Area
                type="monotone"
                dataKey="errors"
                name="Errors"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#errorsGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#ef4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
