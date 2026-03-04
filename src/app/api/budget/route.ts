// drift-ignore-file
// GET /api/budget

import { NextResponse } from "next/server";
import { getAdapterForRequest } from "@/lib/adapter-factory";

export async function GET(request: Request) {
  try {
    const adapter = getAdapterForRequest(new Headers(request.headers));
    const data = await adapter.getBudgetStatus();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/budget]", err); // drift-ignore — server error logging
    return NextResponse.json({ error: "Failed to fetch budget status" }, { status: 500 });
  }
}
