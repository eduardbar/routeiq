// GET /api/config
// Returns public runtime config (data source, connection status).
// Supports runtime provider override via X-Provider + X-Api-Key headers.

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAdapterForRequest } from "@/lib/adapter-factory";

export async function GET(request: Request) {
  const headers = new Headers(request.headers);
  const runtimeProvider = headers.get("x-provider");
  const hasRuntimeKey = !!headers.get("x-api-key");

  // Probe the active adapter to confirm it's reachable
  let connected = false;
  let error: string | null = null;

  try {
    const adapter = getAdapterForRequest(headers);
    const to = new Date();
    const from = new Date(Date.now() - 60 * 60 * 1000);
    await adapter.getOverviewStats(from, to);
    connected = true;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const activeDataSource = runtimeProvider && runtimeProvider !== "mock"
    ? runtimeProvider
    : config.dataSource;

  return NextResponse.json({
    dataSource: activeDataSource,
    connected,
    error,
    hasOpenRouterKey: runtimeProvider === "openrouter" ? hasRuntimeKey : !!config.openrouterApiKey,
    hasLiteLLMKey: runtimeProvider === "litellm" ? hasRuntimeKey : !!config.litellmMasterKey,
    litellmBaseUrl: headers.get("x-litellm-base-url") ?? config.litellmBaseUrl,
    isRuntimeConfig: !!(runtimeProvider && hasRuntimeKey),
  });
}
