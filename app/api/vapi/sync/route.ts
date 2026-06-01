import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { vapiFetchCalls } from "@/lib/vapi";
import type { VapiCall } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/vapi/sync
 * Fetches up to `limit` calls from Vapi and upserts them into Supabase.
 * Skips calls that already exist (by vapi_call_id).
 * Returns { inserted, skipped, errors }.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const limit: number = Number(body.limit ?? 100);

  let vapiCalls: VapiCall[];
  try {
    vapiCalls = await vapiFetchCalls(limit);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const supabase = createAdminSupabase();

  // Fetch existing vapi_call_ids so we can skip them
  const { data: existing } = await supabase
    .from("calls")
    .select("vapi_call_id")
    .in("vapi_call_id", vapiCalls.map((c) => c.id));

  const existingIds = new Set((existing ?? []).map((r) => r.vapi_call_id));

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const vc of vapiCalls) {
    if (existingIds.has(vc.id)) {
      skipped++;
      continue;
    }

    const customerNumber =
      vc.customer?.number ?? vc.phoneNumber?.number ?? "unknown";

    const direction =
      (vc as unknown as { type?: string }).type === "outboundPhoneCall"
        ? "outbound"
        : "inbound";

    const status: "completed" | "missed" | "failed" | "in_progress" =
      vc.status === "ended" ? "completed"
      : vc.status === "in-progress" ? "in_progress"
      : "completed";

    const durationSeconds =
      vc.startedAt && vc.endedAt
        ? Math.round(
            (new Date(vc.endedAt).getTime() - new Date(vc.startedAt).getTime()) / 1000,
          )
        : null;

    const row = {
      vapi_call_id: vc.id,
      phone_number: customerNumber,
      caller_name: vc.customer?.name ?? null,
      direction,
      status,
      duration_seconds: durationSeconds,
      transcript: vc.transcript ?? null,
      recording_url: vc.recordingUrl ?? null,
      notes: vc.summary ?? null,
      started_at: vc.startedAt ?? null,
      ended_at: vc.endedAt ?? null,
      created_at: vc.createdAt ?? vc.startedAt ?? new Date().toISOString(),
    };

    const { error } = await supabase.from("calls").insert(row);
    if (error) {
      errors.push(`${vc.id}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ inserted, skipped, total: vapiCalls.length, errors });
}
