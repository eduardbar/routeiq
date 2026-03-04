"use client";

import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import type { BudgetStatus } from "@/types";
import { formatCost } from "@/lib/utils/formatting";

interface BudgetAlertBannerProps {
  budget: BudgetStatus;
}

// ── Pure helpers (keep component CC low) ─────────────────────

function calcPct(spent: number, limit: number): number {
  return limit > 0 ? (spent / limit) * 100 : 0;
}

type Severity = "ok" | "warning" | "critical" | "projected";

function getSeverity(dailyPct: number, monthlyPct: number, projectedPct: number): Severity {
  if (dailyPct >= 100 || monthlyPct >= 100) return "critical";
  if (dailyPct >= 80 || monthlyPct >= 80) return "warning";
  if (projectedPct >= 90) return "projected";
  return "ok";
}

function getExceededSubject(budget: BudgetStatus) {
  const subject = budget.dailySpentUsd >= budget.dailyLimitUsd ? "daily" : "monthly";
  return {
    subject,
    spent:  subject === "daily" ? budget.dailySpentUsd  : budget.monthlySpentUsd,
    limit:  subject === "daily" ? budget.dailyLimitUsd  : budget.monthlyLimitUsd,
  };
}

function getWarningSubject(budget: BudgetStatus, dailyPct: number, monthlyPct: number) {
  const subject = dailyPct >= 80 ? "daily" : "monthly";
  return {
    subject,
    pct:   subject === "daily" ? dailyPct   : monthlyPct,
    limit: subject === "daily" ? budget.dailyLimitUsd : budget.monthlyLimitUsd,
  };
}

// ── Component ─────────────────────────────────────────────────

export function BudgetAlertBanner({ budget }: BudgetAlertBannerProps) {
  const dailyPct     = calcPct(budget.dailySpentUsd,     budget.dailyLimitUsd);
  const monthlyPct   = calcPct(budget.monthlySpentUsd,   budget.monthlyLimitUsd);
  const projectedPct = calcPct(budget.projectedMonthlyUsd, budget.monthlyLimitUsd);

  const severity = getSeverity(dailyPct, monthlyPct, projectedPct);

  if (severity === "ok") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <p className="text-sm">
          Budget on track —{" "}
          <span className="font-medium">{formatCost(budget.monthlySpentUsd)}</span> spent of{" "}
          <span className="font-medium">{formatCost(budget.monthlyLimitUsd)}</span> monthly limit (
          {monthlyPct.toFixed(0)}%)
        </p>
      </div>
    );
  }

  if (severity === "critical") {
    const { subject, spent, limit } = getExceededSubject(budget);
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Budget limit exceeded</p>
          <p className="text-xs mt-0.5 text-red-400/80">
            {subject.charAt(0).toUpperCase() + subject.slice(1)} spend of{" "}
            <span className="font-medium">{formatCost(spent)}</span> has exceeded the{" "}
            <span className="font-medium">{formatCost(limit)}</span> limit. Consider routing
            traffic to lower-cost models.
          </p>
        </div>
      </div>
    );
  }

  if (severity === "warning") {
    const { subject, pct, limit } = getWarningSubject(budget, dailyPct, monthlyPct);
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">
            {pct.toFixed(0)}% of {subject} budget used
          </p>
          <p className="text-xs mt-0.5 text-amber-400/80">
            You have used{" "}
            <span className="font-medium">{pct.toFixed(0)}%</span> of your{" "}
            <span className="font-medium">{formatCost(limit)}</span> {subject} limit.
            {budget.daysUntilBudgetExhausted !== null &&
              ` At current burn rate, budget will be exhausted in ${budget.daysUntilBudgetExhausted} day${budget.daysUntilBudgetExhausted !== 1 ? "s" : ""}.`}
          </p>
        </div>
      </div>
    );
  }

  // severity === "projected"
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300">
      <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Projected overspend</p>
        <p className="text-xs mt-0.5 text-amber-300/80">
          At current burn rate, you are projected to spend{" "}
          <span className="font-medium">{formatCost(budget.projectedMonthlyUsd)}</span> this
          month — <span className="font-medium">{projectedPct.toFixed(0)}%</span> of your{" "}
          <span className="font-medium">{formatCost(budget.monthlyLimitUsd)}</span> limit.
        </p>
      </div>
    </div>
  );
}
