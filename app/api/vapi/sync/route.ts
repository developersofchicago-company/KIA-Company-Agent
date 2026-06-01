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

  // Fetch existing vapi_call_ids — include phone_number so we can re-sync "unknown" web calls
  const { data: existing } = await supabase
    .from("calls")
    .select("vapi_call_id, phone_number")
    .in("vapi_call_id", vapiCalls.map((c) => c.id));

  const existingMap = new Map(
    (existing ?? []).map((r) => [r.vapi_call_id, r.phone_number as string]),
  );

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const vc of vapiCalls) {
    const existingPhone = existingMap.get(vc.id);
    // Skip if already synced with a real phone number
    if (existingPhone && existingPhone !== "unknown") {
      skipped++;
      continue;
    }

    const isWebCall = vc.type === "webCall";
    const customerNumber =
      vc.customer?.number ?? vc.phoneNumber?.number ?? (isWebCall ? "web-call" : "unknown");

    const direction: "inbound" | "outbound" =
      vc.type === "outboundPhoneCall" ? "outbound" : "inbound";

    const status: "completed" | "missed" | "failed" | "in_progress" =
      vc.status === "ended" ? "completed"
      : vc.status === "in-progress" ? "in_progress"
      : vc.endedAt ? "completed"
      : "in_progress";

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
      cost: vc.cost ?? null,
      transcript: vc.transcript ?? null,
      recording_url: vc.recordingUrl ?? null,
      notes: vc.summary ?? null,
      started_at: vc.startedAt ?? null,
      ended_at: vc.endedAt ?? null,
      created_at: vc.createdAt ?? vc.startedAt ?? new Date().toISOString(),
    };

    const { error } = await supabase
      .from("calls")
      .upsert(row, { onConflict: "vapi_call_id" });
    if (error) {
      errors.push(`${vc.id}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ inserted, skipped, total: vapiCalls.length, errors });
}
