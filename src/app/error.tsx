// Route-level error boundary
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteIQ] Route error:", error);
  }, [error]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="border-destructive/30 max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold">Failed to load page</p>
            <p className="text-muted-foreground text-sm mt-1">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
