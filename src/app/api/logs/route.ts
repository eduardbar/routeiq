// drift-ignore-file
// GET /api/logs
// Query params: from, to, limit, offset, model, status

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter-factory";
import type { RequestStatus } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const model = searchParams.get("model") ?? undefined;
    const status = (searchParams.get("status") ?? undefined) as RequestStatus | undefined;

    const adapter = getAdapter();
    const data = await adapter.getRequestLogs({ from, to, limit, offset, model, status });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/logs]", err); // drift-ignore — server error logging
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
