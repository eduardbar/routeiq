"use client";

import type { ModelStats } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatCost,
  formatLatency,
  formatPercent,
  formatNumber,
  getProviderConfig,
} from "@/lib/utils/formatting";
import { computeHealthScores } from "@/lib/utils/health-score";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModelStatsTableProps {
  models: ModelStats[];
  loading: boolean;
  selected: string[];
  onToggleSelected: (model: string) => void;
}

// Visual bar for relative comparison within a column
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-16">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ModelStatsTable({
  models,
  loading,
  selected,
  onToggleSelected,
}: ModelStatsTableProps) {
  const maxCost = Math.max(...models.map((m) => m.totalCostUsd), 1);
  const maxLatency = Math.max(...models.map((m) => m.avgLatencyMs), 1);
  const maxRequests = Math.max(...models.map((m) => m.totalRequests), 1);
  const healthScores = computeHealthScores(models);

  if (loading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-sm font-medium">All Models</p>
        <p className="text-xs text-muted-foreground">
          Check models to include in charts below
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8"></TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Requests</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Avg / Request</TableHead>
            <TableHead className="text-right" title="Total cost ÷ total tokens × 1000">$/1k Tokens</TableHead>
            <TableHead className="text-right">Avg Latency</TableHead>
            <TableHead className="text-right">P95 Latency</TableHead>
            <TableHead className="text-right">Success Rate</TableHead>
            <TableHead className="text-right">Cache Hit</TableHead>
            <TableHead className="text-right" title="completion tokens / total tokens">Token Eff.</TableHead>
            <TableHead className="text-right" title="Weighted score: reliability 40%, speed 30%, cost 20%, cache 10%">Health</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => {
            const provider = getProviderConfig(model.provider);
            const isSelected = selected.includes(model.model);

            return (
              <TableRow
                key={model.model}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "bg-primary/5"
                )}
                onClick={() => onToggleSelected(model.model)}
              >
                {/* Checkbox para seleccionar en charts */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelected(model.model)}
                  />
                </TableCell>

                {/* Model name + provider badge */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: provider.color }}
                    />
                    <span className="font-medium text-sm">{model.model}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 border-0"
                      style={{
                        backgroundColor: `${provider.color}15`,
                        color: provider.color,
                      }}
                    >
                      {provider.label}
                    </Badge>
                  </div>
                </TableCell>

                {/* Requests con mini bar */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <MiniBar value={model.totalRequests} max={maxRequests} color="#6366f1" />
                    <span className="text-sm tabular-nums">
                      {formatNumber(model.totalRequests)}
                    </span>
                  </div>
                </TableCell>

                {/* Total cost con mini bar */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <MiniBar value={model.totalCostUsd} max={maxCost} color="#10b981" />
                    <span className="text-sm tabular-nums text-emerald-500">
                      {formatCost(model.totalCostUsd)}
                    </span>
                  </div>
                </TableCell>

                {/* Avg cost per request */}
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatCost(model.avgCostPerRequest)}
                </TableCell>

                {/* Cost per 1k tokens */}
                <TableCell className="text-right text-sm tabular-nums font-medium">
                  {model.costPer1kTokens === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-emerald-400">
                      {model.costPer1kTokens < 0.01
                        ? `$${(model.costPer1kTokens * 1000).toFixed(2)}µ`
                        : `$${model.costPer1kTokens.toFixed(4)}`}
                    </span>
                  )}
                </TableCell>

                {/* Avg latency con mini bar */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <MiniBar value={model.avgLatencyMs} max={maxLatency} color="#f59e0b" />
                    <span className="text-sm tabular-nums">
                      {formatLatency(model.avgLatencyMs)}
                    </span>
                  </div>
                </TableCell>

                {/* P95 latency */}
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatLatency(model.p95LatencyMs)}
                </TableCell>

                {/* Success rate */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {model.successRate >= 98 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : model.successRate < 95 ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : null}
                    <span
                      className={cn(
                        "text-sm tabular-nums font-medium",
                        model.successRate >= 98
                          ? "text-emerald-500"
                          : model.successRate < 95
                          ? "text-red-500"
                          : "text-amber-500"
                      )}
                    >
                      {formatPercent(model.successRate)}
                    </span>
                  </div>
                </TableCell>

                {/* Cache hit rate */}
                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatPercent(model.cacheHitRate)}
                </TableCell>

                {/* Token efficiency */}
                <TableCell className="text-right">
                  {(() => {
                    const eff = model.tokenEfficiency;
                    const color = eff > 40 ? "#10b981" : eff >= 20 ? "#f59e0b" : "#ef4444";
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <MiniBar value={eff} max={100} color={color} />
                        <span className="text-sm tabular-nums font-medium" style={{ color }}>
                          {eff.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </TableCell>

                {/* Health score */}
                <TableCell className="text-right">
                  {(() => {
                    const hs = healthScores.get(model.model);
                    if (!hs) return null;
                    return (
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center justify-end gap-1.5 cursor-help">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${hs.color}20`,
                                borderColor: `${hs.color}50`,
                                color: hs.color,
                              }}
                            >
                              {hs.grade}
                            </div>
                            <span className="text-sm tabular-nums font-medium" style={{ color: hs.color }}>
                              {hs.score}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs space-y-1.5 p-3 w-48">
                          <p className="font-semibold" style={{ color: hs.color }}>
                            {hs.label} — {hs.score}/100
                          </p>
                          <div className="space-y-1 text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Reliability (×0.4)</span>
                              <span className="text-foreground">{hs.breakdown.reliability.toFixed(1)}/40</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Speed (×0.3)</span>
                              <span className="text-foreground">{hs.breakdown.speed.toFixed(1)}/30</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost Eff. (×0.2)</span>
                              <span className="text-foreground">{hs.breakdown.costEfficiency.toFixed(1)}/20</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cache (×0.1)</span>
                              <span className="text-foreground">{hs.breakdown.cache.toFixed(1)}/10</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    );
                  })()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
