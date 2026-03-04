"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshIndicatorProps {
  intervalSeconds?: number;
  onRefresh: () => void;
}

export function RefreshIndicator({
  intervalSeconds = 30,
  onRefresh,
}: RefreshIndicatorProps) {
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(intervalSeconds);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefresh();

    setTimeout(() => {
      setIsRefreshing(false);
      countdownRef.current = intervalSeconds;
      setCountdown(intervalSeconds);
    }, 1000);
  }, [onRefresh, intervalSeconds]);

  useEffect(() => {
    countdownRef.current = intervalSeconds;
    setCountdown(intervalSeconds);

    intervalRef.current = setInterval(() => {
      countdownRef.current -= 1;

      if (countdownRef.current <= 0) {
        triggerRefresh();
      } else {
        setCountdown(countdownRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalSeconds, triggerRefresh]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        "select-none"
      )}
    >
      <RefreshCw
        className={cn("w-3 h-3", isRefreshing && "animate-spin")}
      />
      {isRefreshing ? (
        <span>Refreshing...</span>
      ) : (
        <span>
          Live &middot; refreshing in {countdown}s
        </span>
      )}
    </div>
  );
}
