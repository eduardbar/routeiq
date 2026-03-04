"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subDays } from "date-fns";

interface BudgetStatus {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  monthlyLimitUsd: number;
  monthlySpentUsd: number;
  projectedMonthlyUsd: number;
  daysUntilBudgetExhausted: number | null;
}

interface OverviewStats {
  totalRequests: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
  activeModels: number;
  requestsDelta: number;
  costDelta: number;
  latencyDelta: number;
  errorRateDelta: number;
  cacheHitRateDelta: number;
  activeModelsDelta: number;
}

export function BudgetToaster() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const from = subDays(new Date(), 7).toISOString();
    const to = new Date().toISOString();

    Promise.all([
      fetch("/api/budget").then((r) => r.json() as Promise<BudgetStatus>),
      fetch(`/api/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(
        (r) => r.json() as Promise<OverviewStats>
      ),
    ])
      .then(([budget, overview]) => {
        fired.current = true;

        if (budget.dailySpentUsd / budget.dailyLimitUsd > 0.8) {
          toast.warning("Daily budget at 80%+", {
            description: `You've spent $${budget.dailySpentUsd.toFixed(2)} of your $${budget.dailyLimitUsd.toFixed(2)} daily limit.`,
          });
        }

        if (budget.monthlySpentUsd / budget.monthlyLimitUsd > 0.8) {
          toast.warning("Monthly budget at 80%+", {
            description: `You've spent $${budget.monthlySpentUsd.toFixed(2)} of your $${budget.monthlyLimitUsd.toFixed(2)} monthly limit.`,
          });
        }

        if (overview.errorRate > 5) {
          toast.error("High error rate detected", {
            description: `Error rate is ${overview.errorRate.toFixed(1)}% — check your API keys`,
          });
        }
      })
      .catch(() => {
        // Silently ignore fetch errors — toasts are best-effort
      });
  }, []);

  return null;
}
