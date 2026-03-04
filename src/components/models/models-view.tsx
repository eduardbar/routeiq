"use client";

import { useEffect, useState, useCallback } from "react";
import { subDays } from "date-fns";
import type { ModelStats } from "@/types";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { RefreshIndicator } from "@/components/layout/refresh-indicator";
import { ModelStatsTable } from "@/components/models/model-stats-table";
import { ModelCostChart } from "@/components/models/model-cost-chart";
import { ModelRadarChart } from "@/components/models/model-radar-chart";
import { ModelLatencyChart } from "@/components/models/model-latency-chart";
import { ModelP95Chart } from "@/components/models/model-p95-chart";
import { ModelDiffCard } from "@/components/models/model-diff-card";
import { useProviderHeaders } from "@/contexts/provider-config-context";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

export function ModelsView() {
  const [rangeDays, setRangeDays] = useState(7);
  const [models, setModels] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const { getApiHeaders } = useProviderHeaders();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = subDays(to, rangeDays);
      const res = await fetch(
        `/api/models?from=${from.toISOString()}&to=${to.toISOString()}`,
        { headers: getApiHeaders() }
      );
      const data: ModelStats[] = await res.json();
      setModels(data);
      // Default: select top 4 models for charts
      setSelected(data.slice(0, 4).map((m) => m.model));
    } catch (err) {
      console.error("Failed to fetch model stats", err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays, getApiHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredForCharts = models.filter((m) => selected.includes(m.model));

  // Exactly 2 selected → find their ModelStats objects for the diff card
  const diffPair: [ModelStats, ModelStats] | null =
    selected.length === 2
      ? (() => {
          const a = models.find((m) => m.model === selected[0]);
          const b = models.find((m) => m.model === selected[1]);
          return a && b ? [a, b] : null;
        })()
      : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Model Comparison</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance, cost, and reliability across all active models
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshIndicator intervalSeconds={30} onRefresh={fetchData} />
          <DateRangePicker
            ranges={RANGES}
            selected={rangeDays}
            onSelect={setRangeDays}
          />
        </div>
      </div>

      {/* Main stats table */}
      <ModelStatsTable
        models={models}
        loading={loading}
        selected={selected}
        onToggleSelected={(model) =>
          setSelected((prev) =>
            prev.includes(model)
              ? prev.filter((m) => m !== model)
              : [...prev, model]
          )
        }
      />

      {/* Compare hint / diff card */}
      {diffPair ? (
        <ModelDiffCard modelA={diffPair[0]} modelB={diffPair[1]} />
      ) : (
        <p className="text-xs text-muted-foreground text-center py-1">
          Select exactly 2 models to see comparison diff
        </p>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ModelCostChart models={filteredForCharts} loading={loading} />
        <ModelLatencyChart models={filteredForCharts} loading={loading} />
      </div>

      {/* P95 Latency Distribution — full width */}
      <ModelP95Chart models={filteredForCharts} loading={loading} />

      {/* Radar chart — full width */}
      <ModelRadarChart models={filteredForCharts} loading={loading} />
    </div>
  );
}
