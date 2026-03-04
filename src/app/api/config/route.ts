// GET /api/config
// Returns public runtime config (data source, connection status).
// Lets client components know which adapter is active without
// reading env vars directly (not available in browser).

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAdapter } from "@/lib/adapter-factory";

export async function GET() {
  // Probe the active adapter to confirm it's reachable
  let connected = false;
  let error: string | null = null;

  try {
    const adapter = getAdapter();
    // Quick health check — fetch overview for a narrow range
    const to = new Date();
    const from = new Date(Date.now() - 60 * 60 * 1000); // last hour
    await adapter.getOverviewStats(from, to);
    connected = true;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json({
    dataSource: config.dataSource,
    connected,
    error,
    hasOpenRouterKey: !!config.openrouterApiKey,
    hasLiteLLMKey: !!config.litellmMasterKey,
    litellmBaseUrl: config.litellmBaseUrl,
  });
}
