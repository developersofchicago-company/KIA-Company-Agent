import { NextRequest, NextResponse } from "next/server";
import { vapiFetchCalls, getCall } from "@/lib/vapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/vapi/calls          → list all Vapi calls (with optional limit)
 * GET /api/vapi/calls?id=xxx   → single Vapi call by vapiCallId
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const limit = Number(searchParams.get("limit") ?? "100");

  try {
    if (id) {
      const call = await getCall(id);
      return NextResponse.json(call);
    }
    const calls = await vapiFetchCalls(limit);
    return NextResponse.json(calls);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
