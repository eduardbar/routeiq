"use client";

import { useEffect, useState, useCallback } from "react";
import { subDays } from "date-fns";
import type { RequestLog, RequestStatus } from "@/types";
import { LogsTable } from "@/components/logs/logs-table";
import { LogsFilters } from "@/components/logs/logs-filters";
import { LogDetailSheet } from "@/components/logs/log-detail-sheet";

const PAGE_SIZE = 50;

export interface LogFilters {
  rangeDays: number;
  model: string;
  status: RequestStatus | "all";
}

export function LogsView() {
  const [filters, setFilters] = useState<LogFilters>({
    rangeDays: 7,
    model: "all",
    status: "all",
  });
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RequestLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = subDays(to, filters.rangeDays);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (filters.model !== "all") params.set("model", filters.model);
      if (filters.status !== "all") params.set("status", filters.status);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  const handleFiltersChange = (newFilters: LogFilters) => {
    setPage(0);
    setFilters(newFilters);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Request Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Full history of every LLM call with cost, latency, and status
        </p>
      </div>

      {/* Filters bar */}
      <LogsFilters filters={filters} onChange={handleFiltersChange} />

      {/* Results summary */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="text-foreground font-medium">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
          </span>{" "}
          of <span className="text-foreground font-medium">{total.toLocaleString()}</span> requests
        </p>
      )}

      {/* Logs table */}
      <LogsTable
        logs={logs}
        loading={loading}
        onSelect={setSelected}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail sheet (slide-in panel) */}
      <LogDetailSheet log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
