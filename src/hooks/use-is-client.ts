import { useEffect, useState } from "react";

/**
 * useIsClient — returns true only after the component has mounted in the browser.
 *
 * Why this exists:
 *   Recharts' ResponsiveContainer measures DOM dimensions via ResizeObserver.
 *   During SSR (or the first React hydration pass), the DOM doesn't exist yet,
 *   so ResponsiveContainer receives width=-1 / height=-1 and emits a console warning.
 *
 *   The fix: gate chart rendering behind this hook so charts only render
 *   client-side, after the container has real dimensions.
 *
 * Usage:
 *   const isClient = useIsClient();
 *   if (!isClient) return <div className="h-52 bg-muted rounded-lg animate-pulse" />;
 *   return <ResponsiveContainer ... />;
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
