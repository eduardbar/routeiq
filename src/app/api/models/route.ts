// GET /api/models
// Query params: from, to

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter-factory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

    const adapter = getAdapter();
    const data = await adapter.getModelStats(from, to);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/models]", err);
    return NextResponse.json({ error: "Failed to fetch model stats" }, { status: 500 });
  }
}
