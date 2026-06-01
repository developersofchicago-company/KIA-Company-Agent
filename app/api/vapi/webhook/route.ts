import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createAdminSupabase } from "@/lib/supabase-admin";
import {
  appendTranscript,
  saveVapiCall,
  updateCallFromWebhook,
  upsertContact,
} from "@/lib/db";
import type {
  VapiCall,
  VapiCallType,
  VapiEndOfCallReportMessage,
  VapiFunctionCallMessage,
  VapiMessage,
  VapiStatusUpdateMessage,
  VapiToolCallsMessage,
  VapiTranscriptMessage,
  VapiWebhookEvent,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOG = (...args: unknown[]) =>
  console.log("[vapi-webhook]", ...args);

// ---------------------------------------------------------------------------
// Signature check
// ---------------------------------------------------------------------------

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (!expected) {
    // No secret configured -> allow but warn loudly so misconfig doesn't go silent
    console.warn(
      "[vapi-webhook] VAPI_WEBHOOK_SECRET is not set; accepting all requests",
    );
    return true;
  }

  // Vapi sends the configured secret in X-Vapi-Secret; some setups use Authorization
  const headerSecret =
    request.headers.get("x-vapi-secret") ??
    request.headers.get("x-vapi-signature") ??
    "";

  if (headerSecret && constantTimeEquals(headerSecret, expected)) return true;

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer && constantTimeEquals(bearer, expected)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveDirection(call?: VapiCall): "inbound" | "outbound" {
  const t: VapiCallType | undefined = call?.type;
  if (t === "outboundPhoneCall") return "outbound";
  return "inbound";
}

function deriveCustomerNumber(call?: VapiCall): string | null {
  return call?.customer?.number ?? null;
}

function asArgs(
  args: string | Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return args;
}

async function resolveDepartmentByName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("departments")
    .select("id, name, routing_keywords")
    .ilike("name", trimmed)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Handlers per message.type
// ---------------------------------------------------------------------------

async function handleStatusUpdate(msg: VapiStatusUpdateMessage) {
  const call = msg.call;
  if (!call?.id) {
    LOG("status-update missing call.id; ignoring");
    return;
  }
  const status = msg.status ?? call.status;
  const phone = deriveCustomerNumber(call);

  LOG("status-update", { vapi_call_id: call.id, status, phone });

  if (status === "in-progress" || status === "ringing") {
    if (!phone) {
      LOG("status-update without phone number; skipping insert");
      return;
    }
    await saveVapiCall({
      vapi_call_id: call.id,
      phone_number: phone,
      direction: deriveDirection(call),
      started_at: call.startedAt ?? new Date().toISOString(),
    });
    return;
  }

  if (status === "ended") {
    await updateCallFromWebhook(call.id, {
      status: msg.endedReason && /failed|error|no-answer/i.test(msg.endedReason)
        ? "failed"
        : "completed",
      ended_at: call.endedAt ?? new Date().toISOString(),
    });
    return;
  }

  // Generic fallthrough — record whatever we know
  await updateCallFromWebhook(call.id, {});
}

async function handleTranscript(msg: VapiTranscriptMessage) {
  const call = msg.call;
  if (!call?.id || !msg.transcript) return;
  // Only persist finals to avoid duplicated partial chunks
  if (msg.transcriptType && msg.transcriptType !== "final") return;

  const speaker = msg.role === "assistant" ? "AI" : "User";
  const line = `\n[${speaker}] ${msg.transcript}`;
  LOG("transcript", { vapi_call_id: call.id, role: msg.role, len: msg.transcript.length });
  await appendTranscript(call.id, line);
}

async function handleFunctionCall(
  msg: VapiFunctionCallMessage | VapiToolCallsMessage,
) {
  const call = msg.call;
  if (!call?.id) return;

  let name: string | undefined;
  let args: Record<string, unknown> = {};

  if (msg.type === "function-call") {
    name = msg.functionCall?.name;
    args = msg.functionCall?.parameters ?? {};
  } else {
    const tc = msg.toolCalls?.[0];
    name = tc?.function?.name;
    args = asArgs(tc?.function?.arguments);
  }

  LOG("function-call", { vapi_call_id: call.id, name, args });
  if (!name) return;

  // Routing decisions
  const routingNames = new Set([
    "route_to_department",
    "routeToDepartment",
    "transfer_to_department",
    "transferToDepartment",
  ]);

  if (routingNames.has(name)) {
    const dept =
      (args.department as string | undefined) ??
      (args.name as string | undefined) ??
      (args.target as string | undefined);
    if (dept) {
      const departmentId = await resolveDepartmentByName(dept);
      await updateCallFromWebhook(call.id, {
        department_selected: dept,
        department_id: departmentId,
      });
      LOG("routed", { vapi_call_id: call.id, department: dept, departmentId });
    }
  }

  // Language selection
  if (name === "select_language" || name === "selectLanguage") {
    const lang = (args.language as string | undefined)?.toLowerCase();
    if (lang === "urdu" || lang === "english") {
      await updateCallFromWebhook(call.id, {
        language_selected: lang,
        ivr_completed_at: new Date().toISOString(),
        ai_started_at: new Date().toISOString(),
      });
    }
  }
}

async function handleEndOfCallReport(msg: VapiEndOfCallReportMessage) {
  const call = msg.call;
  if (!call?.id) {
    LOG("end-of-call-report missing call.id; ignoring");
    return;
  }

  const phone = deriveCustomerNumber(call);
  const startedAt = call.startedAt ?? null;
  const endedAt = call.endedAt ?? new Date().toISOString();

  let duration = msg.durationSeconds;
  if (duration == null && startedAt) {
    duration = Math.max(
      0,
      Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000),
    );
  }

  const status: "completed" | "failed" =
    msg.endedReason && /failed|error|no-answer/i.test(msg.endedReason)
      ? "failed"
      : "completed";

  LOG("end-of-call-report", {
    vapi_call_id: call.id,
    status,
    duration,
    endedReason: msg.endedReason,
  });

  // Make sure the row exists; if the start event was missed we create it now.
  if (phone) {
    await saveVapiCall({
      vapi_call_id: call.id,
      phone_number: phone,
      direction: deriveDirection(call),
      started_at: startedAt ?? endedAt,
    });
  }

  await updateCallFromWebhook(call.id, {
    status,
    duration_seconds: duration ?? null,
    ended_at: endedAt,
    started_at: startedAt,
    transcript: msg.transcript ?? null,
    recording_url: msg.recordingUrl ?? call.recordingUrl ?? null,
    ai_confidence: extractConfidence(msg),
  });

  if (phone) {
    await upsertContact(phone, {
      name: call.customer?.name ?? null,
      email: call.customer?.email ?? null,
      recordCall: true,
      lastCalledAt: endedAt,
    });
  }
}

function extractConfidence(msg: VapiEndOfCallReportMessage): number | null {
  const raw = msg.analysis?.successEvaluation;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
    if (/success|pass/i.test(raw)) return 1;
    if (/fail/i.test(raw)) return 0;
  }
  if (typeof raw === "boolean") return raw ? 1 : 0;
  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function dispatch(message: VapiMessage): Promise<void> {
  switch (message.type) {
    case "status-update":
      return handleStatusUpdate(message as VapiStatusUpdateMessage);
    case "transcript":
      return handleTranscript(message as VapiTranscriptMessage);
    case "function-call":
      return handleFunctionCall(message as VapiFunctionCallMessage);
    case "tool-calls":
      return handleFunctionCall(message as VapiToolCallsMessage);
    case "end-of-call-report":
      return handleEndOfCallReport(message as VapiEndOfCallReportMessage);
    case "hang":
    case "speech-update":
    case "conversation-update":
    case "user-interrupted":
      LOG("ignored event:", message.type);
      return;
    default:
      LOG("unhandled event type:", message.type);
      return;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    LOG("unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: VapiWebhookEvent;
  try {
    payload = (await request.json()) as VapiWebhookEvent;
  } catch (err) {
    LOG("invalid JSON body", err);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const message = payload?.message;
  if (!message?.type) {
    LOG("missing message.type in payload", payload);
    return NextResponse.json({ error: "missing message.type" }, { status: 400 });
  }

  LOG("received", message.type, "call=", message.call?.id);

  try {
    await dispatch(message);
  } catch (err) {
    // Log but still return 200 so Vapi doesn't retry storm us on a transient DB error
    console.error("[vapi-webhook] handler failed", message.type, err);
    return NextResponse.json(
      { received: true, error: (err as Error).message },
      { status: 200 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// GET helps verify the URL is live from the Vapi dashboard
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "vapi-webhook" });
}
