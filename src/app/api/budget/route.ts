// GET /api/budget

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter-factory";

export async function GET() {
  try {
    const adapter = getAdapter();
    const data = await adapter.getBudgetStatus();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/budget]", err);
    return NextResponse.json({ error: "Failed to fetch budget status" }, { status: 500 });
  }
}
