// drift-ignore-file
"use client";

/**
 * ModelRadarChart — RadarChart de Recharts
 *
 * El Radar (también llamado Spider/Web chart) es ideal para comparar
 * múltiples dimensiones de N entidades al mismo tiempo.
 *
 * Estructura:
 *   <RadarChart data={dimensions}>
 *     <PolarGrid> — la grilla radial
 *     <PolarAngleAxis dataKey="subject"> — los ejes (dimensiones)
 *     <PolarRadiusAxis> — la escala radial (0-100)
 *     <Radar name="modelo" dataKey="valor"> — una serie por modelo
 *   </RadarChart>
 *
 * IMPORTANTE: Los datos tienen que estar NORMALIZADOS a 0-100
 * para que todas las dimensiones sean comparables en la misma escala.
 */

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ModelStats } from "@/types";
import { getProviderConfig } from "@/lib/utils/formatting";

interface ModelRadarChartProps {
  models: ModelStats[];
  loading?: boolean;
}

// Normalize array values to 0-100 scale
// For "lower is better" metrics (cost, latency, error rate), we invert: score = 100 - normalized
function normalizeMetrics(models: ModelStats[]) {
  if (models.length === 0) return [];

  const maxRequests = Math.max(...models.map((m) => m.totalRequests));
  const maxCost     = Math.max(...models.map((m) => m.avgCostPerRequest));
  const maxLatency  = Math.max(...models.map((m) => m.avgLatencyMs));

  // Dimensions visible on the radar
  const dimensions = [
    "Volume",
    "Cost Efficiency",
    "Speed",
    "Reliability",
    "Cache Efficiency",
  ];

  return dimensions.map((subject) => {
    const point: Record<string, number | string> = { subject };

    for (const m of models) {
      let score = 0;
      switch (subject) {
        case "Volume":
          // Higher requests = more used = higher score
          score = maxRequests > 0 ? (m.totalRequests / maxRequests) * 100 : 0;
          break;
        case "Cost Efficiency":
          // Lower cost per request = better
          score = maxCost > 0 ? 100 - (m.avgCostPerRequest / maxCost) * 100 : 100;
          break;
        case "Speed":
          // Lower latency = better
          score = maxLatency > 0 ? 100 - (m.avgLatencyMs / maxLatency) * 100 : 100;
          break;
        case "Reliability":
          // successRate is already 0-100
          score = m.successRate;
          break;
        case "Cache Efficiency":
          // cacheHitRate is already 0-100
          score = m.cacheHitRate;
          break;
      }
      point[m.model] = Math.round(Math.max(0, Math.min(100, score)));
    }

    return point;
  });
}

export function ModelRadarChart({ models, loading }: ModelRadarChartProps) {
  const data = normalizeMetrics(models);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Multi-Dimension Comparison</CardTitle>
        <CardDescription>
          Normalized 0–100 score across 5 dimensions. Higher = better in all axes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-72 bg-muted animate-pulse rounded-lg" />
        ) : models.length < 2 ? (
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Select at least 2 models in the table above to compare
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickCount={4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />

              {/* One <Radar> per model */}
              {models.map((m) => {
                const provider = getProviderConfig(m.provider);
                return (
                  <Radar
                    key={m.model}
                    name={m.model}
                    dataKey={m.model}
                    stroke={provider.color}
                    fill={provider.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={{ r: 3, fill: provider.color }}
                  />
                );
              })}

              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
