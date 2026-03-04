"use client";

import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import type { BudgetStatus, TimeSeriesPoint } from "@/types";
import { BudgetAlertBanner } from "@/components/budget/budget-alert-banner";
import { BudgetGaugeCard } from "@/components/budget/budget-gauge-card";
import { SpendForecastChart } from "@/components/budget/spend-forecast-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCost } from "@/lib/utils/formatting";
import { CalendarDays, TrendingUp, Zap, Clock } from "lucide-react";
import { useProviderHeaders } from "@/contexts/provider-config-context";

export function BudgetView() {
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { getApiHeaders } = useProviderHeaders();

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const headers = getApiHeaders();
        const [budgetRes, tsRes] = await Promise.all([
          fetch("/api/budget", { headers }),
          fetch(
            `/api/timeseries?from=${subDays(new Date(), 30).toISOString()}&to=${new Date().toISOString()}&granularity=day`,
            { headers }
          ),
        ]);
        const [budgetData, tsData] = await Promise.all([
          budgetRes.json() as Promise<BudgetStatus>,
          tsRes.json() as Promise<TimeSeriesPoint[]>,
        ]);
        setBudget(budgetData);
        setTimeseries(tsData);
      } catch (err) {
        console.error("Failed to fetch budget data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Average daily burn from last 7 days of timeseries
  const avgDailyBurn = (() => {
    if (!timeseries.length) return 0;
    const last7 = timeseries.slice(-7);
    return last7.reduce((s, p) => s + p.costUsd, 0) / last7.length;
  })();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Budget &amp; Cost Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track spend against limits and project future costs based on burn rate
        </p>
      </div>

      {/* Alert banner */}
      {loading ? (
        <Skeleton className="h-12 rounded-lg" />
      ) : budget ? (
        <BudgetAlertBanner budget={budget} />
      ) : null}

      {/* Gauge cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading || !budget ? (
          <>
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </>
        ) : (
          <>
            <BudgetGaugeCard
              label="Daily Budget"
              spent={budget.dailySpentUsd}
              limit={budget.dailyLimitUsd}
              icon={<CalendarDays className="w-4 h-4" />}
            />
            <BudgetGaugeCard
              label="Monthly Budget"
              spent={budget.monthlySpentUsd}
              limit={budget.monthlyLimitUsd}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Forecast chart */}
      <SpendForecastChart
        timeseries={timeseries}
        monthlyLimit={budget?.monthlyLimitUsd ?? 500}
        avgDailyBurn={avgDailyBurn}
        loading={loading}
      />

      {/* Stats row: burn rate + projected + days until exhausted */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading || !budget ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Avg Daily Burn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCost(avgDailyBurn)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">based on last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Projected Month Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCost(budget.projectedMonthlyUsd)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  vs {formatCost(budget.monthlyLimitUsd)} limit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Days Until Exhausted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {budget.daysUntilBudgetExhausted === null
                    ? "∞"
                    : `${budget.daysUntilBudgetExhausted}d`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {budget.daysUntilBudgetExhausted === null
                    ? "within monthly limit"
                    : "at current burn rate"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
