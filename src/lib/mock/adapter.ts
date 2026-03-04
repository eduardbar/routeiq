// ============================================================
// MOCK ADAPTER
// Implements IDataAdapter using the generated mock data.
// This is what runs when NEXT_PUBLIC_DATA_SOURCE=mock
// ============================================================

import { subDays } from "date-fns";
import type {
  IDataAdapter,
  OverviewStats,
  TimeSeriesPoint,
  ModelStats,
  RequestLog,
  RequestStatus,
  BudgetStatus,
} from "@/types";
import {
  generateRequestLogs,
  filterLogsByRange,
  computeOverviewStats,
  computeTimeSeries,
  computeModelStats,
  computeBudgetStatus,
} from "./generator";

export class MockAdapter implements IDataAdapter {
  private getLogs() {
    return generateRequestLogs(30);
  }

  async getOverviewStats(from: Date, to: Date): Promise<OverviewStats> {
    const logs = this.getLogs();
    const current = filterLogsByRange(logs, from, to);

    // Previous period = same duration, shifted back
    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration);
    const prevTo = new Date(from.getTime());
    const previous = filterLogsByRange(logs, prevFrom, prevTo);

    return computeOverviewStats(current, previous);
  }

  async getTimeSeries(
    from: Date,
    to: Date,
    granularity: "hour" | "day"
  ): Promise<TimeSeriesPoint[]> {
    const logs = this.getLogs();
    const filtered = filterLogsByRange(logs, from, to);
    return computeTimeSeries(filtered, from, to, granularity);
  }

  async getModelStats(from: Date, to: Date): Promise<ModelStats[]> {
    const logs = this.getLogs();
    const filtered = filterLogsByRange(logs, from, to);
    return computeModelStats(filtered);
  }

  async getRequestLogs(options: {
    from: Date;
    to: Date;
    limit: number;
    offset: number;
    model?: string;
    status?: RequestStatus;
  }): Promise<{ logs: RequestLog[]; total: number }> {
    let logs = this.getLogs();
    logs = filterLogsByRange(logs, options.from, options.to);

    if (options.model) {
      logs = logs.filter((l) => l.model === options.model);
    }
    if (options.status) {
      logs = logs.filter((l) => l.status === options.status);
    }

    return {
      logs: logs.slice(options.offset, options.offset + options.limit),
      total: logs.length,
    };
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    const logs = this.getLogs();
    return computeBudgetStatus(logs);
  }
}
