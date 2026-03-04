// Global error boundary for Next.js App Router
// Catches unhandled errors in any route segment
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteIQ] Unhandled error:", error); // drift-ignore — intentional error boundary logging
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              {error.message || "An unexpected error occurred. Check the console for details."}
            </p>
            <Button onClick={reset} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
