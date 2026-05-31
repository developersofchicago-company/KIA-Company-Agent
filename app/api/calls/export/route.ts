import { NextRequest } from "next/server";

import { createServerSupabase } from "@/lib/supabase-server";
import { callsToCsv, getCallsForExport } from "@/lib/db";
import { parseCallsSearchParams } from "@/lib/calls-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();

  // Auth: only authenticated users — RLS will further restrict rows.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseCallsSearchParams(url.searchParams);

  const calls = await getCallsForExport(supabase, filters);
  const csv = callsToCsv(calls);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calls-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
