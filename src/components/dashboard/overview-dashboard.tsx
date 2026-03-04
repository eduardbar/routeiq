"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { subDays } from "date-fns";
import type { OverviewStats, TimeSeriesPoint } from "@/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RequestVolumeChart } from "@/components/dashboard/request-volume-chart";
import { CostChart } from "@/components/dashboard/cost-chart";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProviderHeaders } from "@/contexts/provider-config-context";
import {
  Activity,
  DollarSign,
  Timer,
  AlertTriangle,
  Layers,
  Zap,
  Info,
  LayoutDashboard,
} from "lucide-react";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

export function OverviewDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getApiHeaders } = useProviderHeaders();

  const [rangeDays, setRangeDays] = useState(
    parseInt(searchParams.get("range") ?? "7", 10) || 7
  );
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("mock");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = subDays(to, rangeDays);
      const granularity = rangeDays <= 1 ? "hour" : "day";
      const headers = getApiHeaders();

      const [overviewRes, timeSeriesRes, configRes] = await Promise.all([
        fetch(`/api/overview?from=${from.toISOString()}&to=${to.toISOString()}`, { headers }),
        fetch(
          `/api/timeseries?from=${from.toISOString()}&to=${to.toISOString()}&granularity=${granularity}`,
          { headers }
        ),
        fetch("/api/config", { headers }),
      ]);

      const [overviewData, timeSeriesData, configData] = await Promise.all([
        overviewRes.json(),
        timeSeriesRes.json(),
        configRes.json(),
      ]);

      setStats(overviewData);
      setTimeSeries(timeSeriesData);
      setDataSource(configData.dataSource ?? "mock");
    } catch (err) {
      console.error("Failed to fetch overview data", err);
    } finally {
      setLoading(false);
    }
  }, [rangeDays, getApiHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detect empty real-data scenario
  const isEmpty = !loading && stats !== null && stats.totalRequests === 0 && dataSource !== "mock";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your LLM traffic, costs, and performance.
          </p>
        </div>
        <DateRangePicker
          ranges={RANGES}
          selected={rangeDays}
          onSelect={(days) => {
            setRangeDays(days);
            router.replace(`?range=${days}`);
          }}
        />
      </div>

      {/* Empty state banner for real data source with no usage yet */}
      {isEmpty && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-sm text-blue-300">
            <strong>Connected to OpenRouter</strong> — No usage data found for this period.
            Start making LLM requests through OpenRouter and the dashboard will populate automatically.
            Alternatively, set <code className="bg-muted px-1 rounded text-xs">NEXT_PUBLIC_DATA_SOURCE=mock</code> to explore with demo data.
          </AlertDescription>
        </Alert>
      )}

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
          delta={stats?.cacheHitRateDelta}
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
      {/* Charts — row 2: latency full width */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <LatencyChart data={timeSeries} loading={loading} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Tokens</p>
            <p className="text-2xl font-bold tabular-nums">
              {loading ? "—" : (() => {
                const total = timeSeries.reduce((s, p) => s + p.tokens, 0);
                if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
                if (total >= 1_000) return `${Math.round(total / 1_000)}k`;
                return String(total);
              })()}
            </p>
            <p className="text-xs text-muted-foreground">across all requests</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Cost / Request</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-500">
              {loading ? "—" : stats && stats.totalRequests > 0
                ? `$${(stats.totalCostUsd / stats.totalRequests).toFixed(4)}`
                : "$0.0000"}
            </p>
            <p className="text-xs text-muted-foreground">per LLM call</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Rate</p>
            <p className="text-2xl font-bold tabular-nums text-primary">
              {loading ? "—" : `${(100 - (stats?.errorRate ?? 0)).toFixed(1)}%`}
            </p>
            <p className="text-xs text-muted-foreground">of requests succeeded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
