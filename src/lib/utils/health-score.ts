// ============================================================
// MODEL HEALTH SCORE
// A single 0-100 score summarising a model's overall health.
//
// Weights:
//   Reliability  40% — success rate (higher = better)
//   Speed        30% — latency (lower = better)
//   Cost Eff.    20% — avg cost per request (lower = better)
//   Cache        10% — cache hit rate (higher = better)
//
// The score is always computed relative to the SET of models
// currently displayed, so the "best" model always scores near 100.
// ============================================================

import type { ModelStats } from "@/types";

export interface HealthScore {
  score: number; // 0–100, integer
  grade: "A" | "B" | "C" | "D" | "F";
  color: string; // hex, for inline styling
  label: string; // "Excellent" | "Good" | "Fair" | "Poor" | "Critical"
  breakdown: {
    reliability: number; // 0–40
    speed: number;       // 0–30
    costEfficiency: number; // 0–20
    cache: number;       // 0–10
  };
}

function toGrade(score: number): HealthScore["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function gradeColor(grade: HealthScore["grade"]): string {
  return (
    { A: "#10b981", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" }[grade]
  );
}

function gradeLabel(grade: HealthScore["grade"]): string {
  return (
    { A: "Excellent", B: "Good", C: "Fair", D: "Poor", F: "Critical" }[grade]
  );
}

/**
 * Compute health scores for an entire set of models.
 * Pass all models together so cost efficiency is normalised correctly.
 */
export function computeHealthScores(models: ModelStats[]): Map<string, HealthScore> {
  if (models.length === 0) return new Map();

  // Pre-compute normalisation bounds
  const minLatency = Math.min(...models.map((m) => m.avgLatencyMs));
  const maxLatency = Math.max(...models.map((m) => m.avgLatencyMs));
  const minCostPer = Math.min(...models.map((m) => m.avgCostPerRequest));
  const maxCostPer = Math.max(...models.map((m) => m.avgCostPerRequest));

  const result = new Map<string, HealthScore>();

  for (const m of models) {
    // --- Reliability (0–40) ---
    const reliability = (m.successRate / 100) * 40;

    // --- Speed (0–30) ---
    // Normalise latency: best (lowest) = 30pts, worst (highest) = 0pts
    let speed: number;
    if (maxLatency === minLatency) {
      speed = 30; // all models tied — everyone gets full speed score
    } else {
      const normalised = (m.avgLatencyMs - minLatency) / (maxLatency - minLatency);
      speed = (1 - normalised) * 30;
    }

    // --- Cost Efficiency (0–20) ---
    // Normalise cost: cheapest = 20pts, most expensive = 0pts
    let costEfficiency: number;
    if (maxCostPer === minCostPer) {
      costEfficiency = 20;
    } else {
      const normalised = (m.avgCostPerRequest - minCostPer) / (maxCostPer - minCostPer);
      costEfficiency = (1 - normalised) * 20;
    }

    // --- Cache (0–10) ---
    const cache = (m.cacheHitRate / 100) * 10;

    const score = Math.round(reliability + speed + costEfficiency + cache);
    const grade = toGrade(score);

    result.set(m.model, {
      score,
      grade,
      color: gradeColor(grade),
      label: gradeLabel(grade),
      breakdown: {
        reliability: Math.round(reliability * 10) / 10,
        speed: Math.round(speed * 10) / 10,
        costEfficiency: Math.round(costEfficiency * 10) / 10,
        cache: Math.round(cache * 10) / 10,
      },
    });
  }

  return result;
}
