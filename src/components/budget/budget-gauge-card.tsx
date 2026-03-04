"use client";

/**
 * BudgetGaugeCard — RadialBarChart de Recharts usado como gauge circular
 *
 * Recharts no tiene un componente "Gauge" nativo.
 * El truco: usamos RadialBarChart con startAngle/endAngle para crear
 * un semicírculo, y apilamos una barra de "track" (fondo) más la barra real.
 *
 * startAngle={200} endAngle={-20} crea un arco de 220°
 * La barra de track tiene value=100 y fill gris tenue
 * La barra real tiene value=pct y fill según severity
 */

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost } from "@/lib/utils/formatting";

interface BudgetGaugeCardProps {
  label: string;
  spent: number;
  limit: number;
  icon: React.ReactNode;
}

function getSeverityColor(pct: number): string {
  if (pct >= 100) return "#ef4444"; // red
  if (pct >= 80)  return "#f59e0b"; // amber
  if (pct >= 60)  return "#eab308"; // yellow
  return "#10b981";                  // emerald
}

export function BudgetGaugeCard({ label, spent, limit, icon }: BudgetGaugeCardProps) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const color = getSeverityColor(pct);

  // RadialBarChart data: two bars — track (bg) + actual value
  const data = [
    { name: "track", value: 100, fill: "hsl(var(--muted))" },
    { name: "value", value: pct,  fill: color },
  ];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Gauge */}
        <div className="relative h-36">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="75%"
              innerRadius="60%"
              outerRadius="90%"
              startAngle={200}
              endAngle={-20}
              data={data}
              barSize={12}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={6}
                background={false}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {pct.toFixed(0)}%
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">of limit</span>
          </div>
        </div>

        {/* Spend details below gauge */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCost(spent)}</p>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Limit</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCost(limit)}</p>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">
              {formatCost(Math.max(0, limit - spent))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
