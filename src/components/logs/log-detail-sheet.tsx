"use client";

import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { RequestLog, RequestStatus } from "@/types";
import { formatCost, formatLatency, getProviderConfig } from "@/lib/utils/formatting";
import {
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Coins,
  Hash,
  Key,
  Cpu,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_ICON: Record<RequestStatus, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error:   <XCircle     className="w-4 h-4 text-red-400"     />,
  cached:  <Zap         className="w-4 h-4 text-blue-400"    />,
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error:   "bg-red-500/10   text-red-400   border-red-500/20",
  cached:  "bg-blue-500/10  text-blue-400  border-blue-500/20",
};

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium font-mono">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface LogDetailSheetProps {
  log: RequestLog | null;
  onClose: () => void;
}

export function LogDetailSheet({ log, onClose }: LogDetailSheetProps) {
  const provider = log ? getProviderConfig(log.provider) : null;

  return (
    <Sheet open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        {log && provider && (
          <>
            <SheetHeader className="space-y-1">
              <SheetTitle className="text-base font-semibold leading-tight">
                Request Detail
              </SheetTitle>
              <SheetDescription className="font-mono text-[11px]">
                {log.id}
              </SheetDescription>
            </SheetHeader>

            {/* Status + timestamp */}
            <div className="mt-4 flex items-center justify-between">
              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 ${STATUS_COLOR[log.status]}`}
              >
                {STATUS_ICON[log.status]}
                <span className="capitalize">{log.status}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.timestamp), "MMM d, yyyy — HH:mm:ss")}
              </span>
            </div>

            {/* Model + provider */}
            <div className="mt-4 rounded-md border border-border/40 bg-muted/20 p-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{log.model}</p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: provider.color }}
                  >
                    {provider.label}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-border/40" />

            {/* Core metrics */}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Metrics
            </p>
            <div className="divide-y divide-border/30">
              <StatRow
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Latency"
                value={formatLatency(log.latencyMs)}
              />
              <StatRow
                icon={<Coins className="w-3.5 h-3.5" />}
                label="Cost"
                value={formatCost(log.costUsd)}
              />
              <StatRow
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Total Tokens"
                value={log.totalTokens.toLocaleString()}
              />
              <StatRow
                icon={<Hash className="w-3.5 h-3.5 opacity-60" />}
                label="Prompt Tokens"
                value={log.promptTokens.toLocaleString()}
              />
              <StatRow
                icon={<Hash className="w-3.5 h-3.5 opacity-40" />}
                label="Completion Tokens"
                value={log.completionTokens.toLocaleString()}
              />
              <StatRow
                icon={<Key className="w-3.5 h-3.5" />}
                label="API Key"
                value={log.apiKeyAlias}
              />
              <StatRow
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Cache Hit"
                value={log.cacheHit ? "Yes" : "No"}
              />
            </div>

            {/* Token breakdown bar */}
            <Separator className="my-4 bg-border/40" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Token Breakdown
            </p>
            <div className="space-y-2">
              {/* Prompt */}
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Prompt</span>
                  <span>{((log.promptTokens / log.totalTokens) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${(log.promptTokens / log.totalTokens) * 100}%` }}
                  />
                </div>
              </div>
              {/* Completion */}
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Completion</span>
                  <span>{((log.completionTokens / log.totalTokens) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(log.completionTokens / log.totalTokens) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
