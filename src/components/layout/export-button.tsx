"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton() {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);

    // Stamp the export date on the dashboard container so the print
    // CSS ::before pseudo-element can read it via attr().
    const dashboard = document.getElementById("dashboard-content");
    const dateLabel = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    if (dashboard) {
      dashboard.setAttribute("data-export-date", dateLabel);
    }

    // Give React one tick to re-render the loading state, then print.
    requestAnimationFrame(() => {
      window.print();
      // Restore button state after the print dialog closes.
      setExporting(false);
    });
  }

  return (
    <Button
      id="export-btn"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className="gap-1.5"
    >
      {exporting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      Export PDF
    </Button>
  );
}
