// drift-ignore-file
// GET /api/timeseries
// Query params: from, to, granularity (hour|day)

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter-factory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const granularity = (searchParams.get("granularity") ?? "day") as "hour" | "day";

    const adapter = getAdapter();
    const data = await adapter.getTimeSeries(from, to, granularity);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/timeseries]", err); // drift-ignore — server error logging
    return NextResponse.json({ error: "Failed to fetch time series" }, { status: 500 });
  }
}
