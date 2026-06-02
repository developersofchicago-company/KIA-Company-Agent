import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createAdminSupabase } from "@/lib/supabase-admin";
import {
  appendTranscript,
  saveVapiCall,
  updateCallFromWebhook,
  upsertContact,
} from "@/lib/db";
import {
  getActiveCalConnection,
  resolveFirstEventTypeId,
  resolveEventTypeByName,
  getEventTypes,
  getAvailableSlots,
  createBooking,
  saveAppointment,
} from "@/lib/cal";
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
): Promise<Record<string, unknown> | null> {
  const call = msg.call;
  if (!call?.id) return null;

  let name: string | undefined;
  let args: Record<string, unknown> = {};
  let toolCallId: string | undefined;

  if (msg.type === "function-call") {
    name = msg.functionCall?.name;
    args = msg.functionCall?.parameters ?? {};
  } else {
    const tc = msg.toolCalls?.[0];
    name = tc?.function?.name;
    args = asArgs(tc?.function?.arguments);
    toolCallId = tc?.id;
  }

  LOG("function-call", { vapi_call_id: call.id, name, args });
  if (!name) return null;

  // Helper to shape a result for either function-call or tool-calls format.
  const reply = (result: unknown): Record<string, unknown> =>
    toolCallId
      ? { results: [{ toolCallId, result: JSON.stringify(result) }] }
      : { result };

  // ── Cal.com: List available services ────────────────────────────────────
  if (name === "list_services" || name === "listServices") {
    try {
      const conn = await getActiveCalConnection(call.assistantId);
      if (!conn) return reply({ error: "No calendar is connected yet." });

      const eventTypes = await getEventTypes(conn.calcom_api_key);
      const services = eventTypes.map(t => ({
        name: t.title,
        slug: t.slug,
        duration_minutes: t.lengthInMinutes,
        description: t.description,
      }));

      LOG("list_services", { count: services.length });
      return reply({
        services,
        message: services.length 
          ? `We offer ${services.length} services: ${services.map(s => s.name).join(", ")}. Which would you like to book?`
          : "No services are currently configured on the calendar.",
      });
    } catch (err) {
      LOG("list_services error", err);
      return reply({ error: "Could not fetch services right now." });
    }
  }

  // ── Cal.com: Check availability ─────────────────────────────────────────
  if (name === "check_availability" || name === "checkAvailability") {
    try {
      const conn = await getActiveCalConnection(call.assistantId);
      if (!conn) return reply({ error: "No calendar is connected yet." });

      // Get service name from args and find matching event type
      const serviceName = (args.service_name ?? args.serviceName ?? args.service) as string | undefined;
      if (!serviceName) {
        return reply({ error: "Please specify which service you want to check availability for. Call list_services first to see options." });
      }

      const eventType = await resolveEventTypeByName(conn.calcom_api_key, serviceName);
      if (!eventType) {
        const allTypes = await getEventTypes(conn.calcom_api_key);
        const availableServices = allTypes.map(t => t.title).join(", ");
        return reply({ 
          error: `Could not find a service matching "${serviceName}". Available services: ${availableServices}` 
        });
      }

      const days = Number(args.days) || 3;
      const now = new Date();
      const end = new Date(now.getTime() + days * 86400000);
      const tz = conn.timezone ?? "America/Chicago";
      const slots = await getAvailableSlots(
        now.toISOString(),
        end.toISOString(),
        eventType.id,
        conn.calcom_api_key,
      );

      const available: string[] = [];
      for (const daySlots of Object.values(slots)) {
        for (const slot of daySlots) {
          const d = new Date(slot.time);
          available.push(
            `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}`,
          );
        }
      }
      LOG("check_availability", { service: eventType.title, total: available.length });
      return reply({
        service_name: eventType.title,
        duration_minutes: eventType.lengthInMinutes,
        available_slots: available.slice(0, 10),
        total_slots: available.length,
        message: available.length
          ? `There are ${available.length} open slots for ${eventType.title} in the next ${days} days.`
          : `No open slots for ${eventType.title} in the next ${days} days.`,
      });
    } catch (err) {
      LOG("check_availability error", err);
      return reply({ error: "Could not fetch availability right now." });
    }
  }

  // ── Cal.com: Book appointment ───────────────────────────────────────────
  if (name === "book_appointment" || name === "bookAppointment") {
    try {
      const conn = await getActiveCalConnection(call.assistantId);
      if (!conn) return reply({ error: "No calendar is connected yet." });

      // Get service name and find matching event type
      const serviceName = (args.service_name ?? args.serviceName ?? args.service_type ?? args.serviceType) as string | undefined;
      if (!serviceName) {
        return reply({ error: "Please specify which service to book. Call list_services first to see options." });
      }

      const eventType = await resolveEventTypeByName(conn.calcom_api_key, serviceName);
      if (!eventType) {
        const allTypes = await getEventTypes(conn.calcom_api_key);
        const availableServices = allTypes.map(t => t.title).join(", ");
        return reply({ 
          error: `Could not find a service matching "${serviceName}". Available services: ${availableServices}` 
        });
      }

      const startTime = (args.start_time ?? args.startTime ?? args.time) as string | undefined;
      const attendeeName = (args.name as string | undefined) ?? "Caller";
      const attendeeEmail = (args.email as string | undefined) ?? "caller@unknown.com";
      const attendeePhone = (args.phone as string | undefined) ?? deriveCustomerNumber(call) ?? null;
      const tz = (args.timezone as string | undefined) ?? conn.timezone ?? "America/Chicago";

      if (!startTime) return reply({ error: "I need a specific date and time to book." });

      const booking = await createBooking(
        startTime,
        { name: attendeeName, email: attendeeEmail, timeZone: tz },
        eventType.id,
        conn.calcom_api_key,
      );

      // Persist into our appointments table (linked to the call).
      try {
        const admin = createAdminSupabase();
        const { data: callRow } = await admin
          .from("calls")
          .select("id")
          .eq("vapi_call_id", call.id)
          .maybeSingle();

        await saveAppointment({
          calendar_connection_id: conn.id,
          call_id: (callRow?.id as string | undefined) ?? null,
          provider_event_id: booking.uid,
          provider_booking_url: booking.meetingUrl ?? null,
          title: booking.title ?? `${args.service_type ?? "Appointment"}`,
          description: (args.service_type as string | undefined) ?? null,
          start_time: booking.startTime,
          end_time: booking.endTime,
          timezone: tz,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          attendee_phone: attendeePhone,
          status: "booked",
        });
      } catch (saveErr) {
        LOG("appointment save failed (booking still created)", saveErr);
      }

      LOG("book_appointment success", { uid: booking.uid });
      return reply({
        success: true,
        booking_id: booking.uid,
        start_time: booking.startTime,
        meeting_url: booking.meetingUrl ?? null,
        message: `Appointment confirmed for ${new Date(booking.startTime).toLocaleString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
      });
    } catch (err) {
      LOG("book_appointment error", err);
      return reply({ error: `Booking failed: ${(err as Error).message}. Please try another time.` });
    }
  }

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

  return null;
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

async function dispatch(
  message: VapiMessage,
): Promise<Record<string, unknown> | null> {
  switch (message.type) {
    case "status-update":
      await handleStatusUpdate(message as VapiStatusUpdateMessage);
      return null;
    case "transcript":
      await handleTranscript(message as VapiTranscriptMessage);
      return null;
    case "function-call":
      return handleFunctionCall(message as VapiFunctionCallMessage);
    case "tool-calls":
      return handleFunctionCall(message as VapiToolCallsMessage);
    case "end-of-call-report":
      await handleEndOfCallReport(message as VapiEndOfCallReportMessage);
      return null;
    case "hang":
    case "speech-update":
    case "conversation-update":
    case "user-interrupted":
      LOG("ignored event:", message.type);
      return null;
    default:
      LOG("unhandled event type:", message.type);
      return null;
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
    const result = await dispatch(message);
    // Cal.com tool calls return data the AI needs mid-call — send it back.
    if (result) {
      LOG("returning function result to Vapi", Object.keys(result));
      return NextResponse.json(result, { status: 200 });
    }
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
