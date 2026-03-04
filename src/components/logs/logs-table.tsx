"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RequestLog, RequestStatus } from "@/types";
import { formatCost, formatLatency, getProviderConfig } from "@/lib/utils/formatting";

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<RequestStatus, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error:   "bg-red-500/10   text-red-400   border-red-500/20",
  cached:  "bg-blue-500/10  text-blue-400  border-blue-500/20",
};

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <TableRow key={i} className="border-border/40">
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-3.5 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LogsTableProps {
  logs: RequestLog[];
  loading: boolean;
  onSelect: (log: RequestLog) => void;
}

export function LogsTable({ logs, loading, onSelect }: LogsTableProps) {
  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs font-medium text-muted-foreground w-[160px]">Timestamp</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Model</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Provider</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground text-right">Tokens</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground text-right">Cost</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground text-right">Latency</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">API Key</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton />
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                No requests found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const provider = getProviderConfig(log.provider);
              return (
                <TableRow
                  key={log.id}
                  className="border-border/40 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => onSelect(log)}
                >
                  {/* Timestamp — relative with exact tooltip */}
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-mono">
                        {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss 'UTC'")}
                      </TooltipContent>
                    </UITooltip>
                  </TableCell>

                  {/* Model */}
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">
                    {log.model}
                  </TableCell>

                  {/* Provider */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${provider.bg}`}
                      style={{ color: provider.color }}
                    >
                      {provider.label}
                    </span>
                  </TableCell>

                  {/* Tokens */}
                  <TableCell className="text-xs text-right text-muted-foreground">
                    {log.totalTokens.toLocaleString()}
                  </TableCell>

                  {/* Cost */}
                  <TableCell className="text-xs text-right font-mono">
                    {formatCost(log.costUsd)}
                  </TableCell>

                  {/* Latency */}
                  <TableCell className="text-xs text-right font-mono">
                    {formatLatency(log.latencyMs)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>

                  {/* API Key alias */}
                  <TableCell className="text-[11px] text-muted-foreground font-mono">
                    {log.apiKeyAlias}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
