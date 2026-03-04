"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Range {
  label: string;
  days: number;
}

interface DateRangePickerProps {
  ranges: Range[];
  selected: number;
  onSelect: (days: number) => void;
}

export function DateRangePicker({ ranges, selected, onSelect }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {ranges.map((range) => (
        <Button
          key={range.days}
          variant="ghost"
          size="sm"
          onClick={() => onSelect(range.days)}
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-md transition-all",
            selected === range.days
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent"
          )}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
