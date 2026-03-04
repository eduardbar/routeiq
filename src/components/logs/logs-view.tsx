"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { subDays, format } from "date-fns";
import { Download } from "lucide-react";
import type { RequestLog, RequestStatus } from "@/types";
import { LogsTable } from "@/components/logs/logs-table";
import { LogsFilters } from "@/components/logs/logs-filters";
import { LogDetailSheet } from "@/components/logs/log-detail-sheet";
import { useProviderHeaders } from "@/contexts/provider-config-context";

const PAGE_SIZE = 50;

const VALID_STATUSES = new Set<RequestStatus | "all">(["success", "error", "cached", "all"]);

function parseStatus(value: string | null): RequestStatus | "all" {
  if (value && VALID_STATUSES.has(value as RequestStatus | "all")) {
    return value as RequestStatus | "all";
  }
  return "all";
}

export interface LogFilters {
  rangeDays: number;
  model: string;
  status: RequestStatus | "all";
}

export function LogsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getApiHeaders } = useProviderHeaders();

  const [filters, setFilters] = useState<LogFilters>({
    rangeDays: parseInt(searchParams.get("range") ?? "7", 10) || 7,
    model: searchParams.get("model") ?? "all",
    status: parseStatus(searchParams.get("status")),
  });
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RequestLog | null>(null);
  const [exporting, setExporting] = useState(false);

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

      const res = await fetch(`/api/logs?${params}`, { headers: getApiHeaders() });
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

  // Reset page when filters change and sync URL
  const handleFiltersChange = (newFilters: LogFilters) => {
    setPage(0);
    setFilters(newFilters);

    const params = new URLSearchParams();
    params.set("range", String(newFilters.rangeDays));
    if (newFilters.model !== "all") params.set("model", newFilters.model);
    if (newFilters.status !== "all") params.set("status", newFilters.status);
    router.replace(`?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const to = new Date();
      const from = subDays(to, filters.rangeDays);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: "10000",
        offset: "0",
      });
      if (filters.model !== "all") params.set("model", filters.model);
      if (filters.status !== "all") params.set("status", filters.status);

      const res = await fetch(`/api/logs?${params}`, { headers: getApiHeaders() });
      const data = (await res.json()) as { logs: RequestLog[]; total: number };

      const header =
        "timestamp,model,provider,status,promptTokens,completionTokens,totalTokens,costUsd,latencyMs,cacheHit,apiKeyAlias";

      const rows = data.logs.map((log) =>
        [
          log.timestamp,
          log.model,
          log.provider,
          log.status,
          log.promptTokens,
          log.completionTokens,
          log.totalTokens,
          log.costUsd,
          log.latencyMs,
          log.cacheHit,
          log.apiKeyAlias,
        ].join(",")
      );

      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `routeiq-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export logs", err);
    } finally {
      setExporting(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="text-foreground font-medium">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
            </span>{" "}
            of <span className="text-foreground font-medium">{total.toLocaleString()}</span> requests
          </p>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
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
