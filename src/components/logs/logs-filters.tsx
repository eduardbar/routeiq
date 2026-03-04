"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogFilters } from "@/components/logs/logs-view";
import type { RequestStatus } from "@/types";

const RANGE_OPTIONS = [
  { value: "1",  label: "Last 24 hours" },
  { value: "7",  label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

const STATUS_OPTIONS: { value: RequestStatus | "all"; label: string }[] = [
  { value: "all",     label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error",   label: "Error" },
  { value: "cached",  label: "Cached" },
];

const MODEL_OPTIONS = [
  { value: "all",                                      label: "All models" },
  { value: "gpt-4o",                                   label: "GPT-4o" },
  { value: "gpt-4o-mini",                              label: "GPT-4o Mini" },
  { value: "claude-3-5-sonnet-20241022",               label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku-20240307",                  label: "Claude 3 Haiku" },
  { value: "gemini-1.5-pro",                           label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash",                         label: "Gemini 1.5 Flash" },
  { value: "meta-llama/llama-3.3-70b-instruct",        label: "Llama 3.3 70B" },
  { value: "mistralai/mistral-large-2411",             label: "Mistral Large" },
];

interface LogsFiltersProps {
  filters: LogFilters;
  onChange: (filters: LogFilters) => void;
}

export function LogsFilters({ filters, onChange }: LogsFiltersProps) {
  const update = (patch: Partial<LogFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-3">
      {/* Time range */}
      <Select
        value={String(filters.rangeDays)}
        onValueChange={(v) => update({ rangeDays: Number(v) })}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Model */}
      <Select
        value={filters.model}
        onValueChange={(v) => update({ model: v })}
      >
        <SelectTrigger className="w-[200px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODEL_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(v) => update({ status: v as RequestStatus | "all" })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
