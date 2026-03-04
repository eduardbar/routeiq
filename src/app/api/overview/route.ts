// GET /api/overview
// Returns KPI snapshot for the selected time range
// Query params: from (ISO), to (ISO)

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter-factory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default: last 7 days
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

    const adapter = getAdapter();
    const data = await adapter.getOverviewStats(from, to);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/overview]", err);
    return NextResponse.json({ error: "Failed to fetch overview stats" }, { status: 500 });
  }
}
