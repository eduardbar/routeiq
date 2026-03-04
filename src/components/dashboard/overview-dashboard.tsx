"use client";

import { useEffect, useState, useCallback } from "react";
import { subDays } from "date-fns";
import type { OverviewStats, TimeSeriesPoint } from "@/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RequestVolumeChart } from "@/components/dashboard/request-volume-chart";
import { CostChart } from "@/components/dashboard/cost-chart";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import {
  Activity,
  DollarSign,
  Timer,
  AlertTriangle,
  Layers,
  Zap,
} from "lucide-react";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

export function OverviewDashboard() {
  const [rangeDays, setRangeDays] = useState(7);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = subDays(to, rangeDays);
      const granularity = rangeDays <= 1 ? "hour" : "day";

      const [overviewRes, timeSeriesRes] = await Promise.all([
        fetch(`/api/overview?from=${from.toISOString()}&to=${to.toISOString()}`),
        fetch(
          `/api/timeseries?from=${from.toISOString()}&to=${to.toISOString()}&granularity=${granularity}`
        ),
      ]);

      const [overviewData, timeSeriesData] = await Promise.all([
        overviewRes.json(),
        timeSeriesRes.json(),
      ]);

      setStats(overviewData);
      setTimeSeries(timeSeriesData);
    } catch (err) {
      console.error("Failed to fetch overview data", err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your LLM traffic, costs, and performance
          </p>
        </div>
        <DateRangePicker
          ranges={RANGES}
          selected={rangeDays}
          onSelect={setRangeDays}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard
          title="Total Requests"
          value={stats?.totalRequests ?? 0}
          delta={stats?.requestsDelta}
          format="number"
          icon={Activity}
          loading={loading}
        />
        <KpiCard
          title="Total Cost"
          value={stats?.totalCostUsd ?? 0}
          delta={stats?.costDelta}
          format="currency"
          icon={DollarSign}
          loading={loading}
          deltaInverted // higher cost = bad
        />
        <KpiCard
          title="Avg Latency"
          value={stats?.avgLatencyMs ?? 0}
          delta={stats?.latencyDelta}
          format="latency"
          icon={Timer}
          loading={loading}
          deltaInverted // higher latency = bad
        />
        <KpiCard
          title="Error Rate"
          value={stats?.errorRate ?? 0}
          delta={stats?.errorRateDelta}
          format="percent"
          icon={AlertTriangle}
          loading={loading}
          deltaInverted // higher errors = bad
          alertThreshold={5}
        />
        <KpiCard
          title="Cache Hit Rate"
          value={stats?.cacheHitRate ?? 0}
          delta={undefined}
          format="percent"
          icon={Zap}
          loading={loading}
        />
        <KpiCard
          title="Active Models"
          value={stats?.activeModels ?? 0}
          delta={undefined}
          format="number"
          icon={Layers}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RequestVolumeChart data={timeSeries} loading={loading} />
        <CostChart data={timeSeries} loading={loading} />
      </div>
      <div className="grid grid-cols-1">
        <LatencyChart data={timeSeries} loading={loading} />
      </div>
    </div>
  );
}
