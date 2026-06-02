// ---------------------------------------------------------------------------
// Cal.com API v2 client — server-only
// ---------------------------------------------------------------------------

import { createAdminSupabase } from "@/lib/supabase-admin";

const CAL_BASE = "https://api.cal.com/v2";

// Cal.com requires a different API version header per endpoint.
const CAL_API_VERSION = {
  eventTypes: "2024-06-14",
  slots: "2024-08-13",
  bookings: "2024-08-13",
  default: "2024-08-13",
} as const;

function getApiKey(explicit?: string): string {
  const key = explicit ?? process.env.CAL_API_KEY;
  if (!key) throw new Error("Cal.com API key not provided (no DB connection or env var)");
  return key;
}

function getEventTypeId(): number {
  const id = process.env.CAL_EVENT_TYPE_ID;
  if (!id) throw new Error("CAL_EVENT_TYPE_ID is not set in the environment");
  return Number(id);
}

async function calFetch<T>(
  path: string,
  init: RequestInit = {},
  apiVersion: string = CAL_API_VERSION.default,
  apiKey?: string,
): Promise<T> {
  const res = await fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey(apiKey)}`,
      "cal-api-version": apiVersion,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok) {
    const msg =
      body?.error?.message ?? body?.message ?? `Cal.com API error ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  description: string | null;
  locations: { type: string; integration?: string }[];
  bookingUrl: string;
}

export interface CalSlot {
  time: string; // ISO 8601
}

export interface CalSlotsResponse {
  data: {
    slots: Record<string, CalSlot[]>;
  };
}

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingUrl?: string;
}

export interface CalBookingResponse {
  status: string;
  data: CalBooking;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Get all event types for the authenticated user */
export async function getEventTypes(apiKey?: string): Promise<CalEventType[]> {
  const res = await calFetch<{ status: string; data: CalEventType[] }>(
    "/event-types",
    {},
    CAL_API_VERSION.eventTypes,
    apiKey,
  );
  return res.data;
}

/**
 * Get available time slots for an event type.
 * @param startTime  ISO date string (e.g. "2026-06-01T00:00:00Z")
 * @param endTime    ISO date string (e.g. "2026-06-07T23:59:59Z")
 * @param eventTypeId  Optional, defaults to CAL_EVENT_TYPE_ID env var
 */
export async function getAvailableSlots(
  startTime: string,
  endTime: string,
  eventTypeId?: number,
  apiKey?: string,
): Promise<Record<string, CalSlot[]>> {
  const id = eventTypeId ?? getEventTypeId();
  const params = new URLSearchParams({
    startTime,
    endTime,
    eventTypeId: String(id),
  });
  const res = await calFetch<CalSlotsResponse>(
    `/slots/available?${params}`,
    {},
    CAL_API_VERSION.slots,
    apiKey,
  );
  return res.data.slots;
}

/**
 * Book an appointment.
 * @param start      ISO date string of the chosen slot
 * @param attendee   { name, email, timeZone, language? }
 * @param eventTypeId  Optional, defaults to CAL_EVENT_TYPE_ID env var
 */
export async function createBooking(
  start: string,
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    language?: string;
  },
  eventTypeId?: number,
  apiKey?: string,
): Promise<CalBooking> {
  const id = eventTypeId ?? getEventTypeId();
  const res = await calFetch<CalBookingResponse>(
    "/bookings",
    {
      method: "POST",
      body: JSON.stringify({
        start,
        eventTypeId: id,
        attendee: {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: attendee.language ?? "en",
        },
      }),
    },
    CAL_API_VERSION.bookings,
    apiKey,
  );
  return res.data;
}

/** Get current user profile from Cal.com */
export async function getCalProfile(apiKey?: string) {
  const res = await calFetch<{
    status: string;
    data: {
      id: number;
      name: string;
      email: string;
      username: string;
      timeZone: string;
      avatarUrl: string;
    };
  }>("/me", {}, CAL_API_VERSION.default, apiKey);
  return res.data;
}

// ---------------------------------------------------------------------------
// Multi-tenant helpers — used by the Vapi webhook during live calls
// ---------------------------------------------------------------------------

export interface CalConnection {
  id: string;
  calcom_api_key: string;
  timezone: string | null;
  default_duration: number | null;
  department_id: string | null;
}

/**
 * Find the active Cal.com connection to use for a given call.
 * Resolution order:
 *   1. If the call's Vapi assistant maps to a department that has its own
 *      calcom connection, use that.
 *   2. Otherwise fall back to the first active calcom connection (single-tenant).
 */
export async function getActiveCalConnection(
  vapiAssistantId?: string | null,
): Promise<CalConnection | null> {
  const admin = createAdminSupabase();

  // 1. Try assistant -> department -> connection
  if (vapiAssistantId) {
    const { data: dept } = await admin
      .from("departments")
      .select("id")
      .eq("vapi_assistant_id", vapiAssistantId)
      .maybeSingle();

    if (dept?.id) {
      const { data: conn } = await admin
        .from("calendar_connections")
        .select("id, calcom_api_key, timezone, default_duration, department_id")
        .eq("provider", "calcom")
        .eq("is_active", true)
        .eq("department_id", dept.id)
        .not("calcom_api_key", "is", null)
        .maybeSingle();
      if (conn?.calcom_api_key) return conn as CalConnection;
    }
  }

  // 2. Fallback: first active calcom connection
  const { data } = await admin
    .from("calendar_connections")
    .select("id, calcom_api_key, timezone, default_duration, department_id")
    .eq("provider", "calcom")
    .eq("is_active", true)
    .not("calcom_api_key", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as CalConnection) ?? null;
}

/** Resolve the first event type id for a Cal.com account. */
export async function resolveFirstEventTypeId(
  apiKey: string,
): Promise<number | null> {
  const types = await getEventTypes(apiKey);
  return types[0]?.id ?? null;
}

/** Find event type by name (case-insensitive partial match). */
export async function resolveEventTypeByName(
  apiKey: string,
  serviceName: string,
): Promise<{ id: number; title: string; slug: string; lengthInMinutes: number } | null> {
  const types = await getEventTypes(apiKey);
  const search = serviceName.toLowerCase().trim();
  
  // Try exact match first
  const exact = types.find(t => 
    t.title.toLowerCase() === search || 
    t.slug.toLowerCase() === search
  );
  if (exact) return exact;
  
  // Try partial match
  const partial = types.find(t => 
    t.title.toLowerCase().includes(search) || 
    t.slug.toLowerCase().includes(search)
  );
  return partial ?? null;
}

interface SaveAppointmentInput {
  calendar_connection_id: string;
  call_id?: string | null;
  contact_id?: string | null;
  provider_event_id?: string | null;
  provider_booking_url?: string | null;
  title?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  timezone?: string | null;
  attendee_name?: string | null;
  attendee_email?: string | null;
  attendee_phone?: string | null;
  status?: string;
}

/** Save a booked appointment to the appointments table (AI-created). */
export async function saveAppointment(input: SaveAppointmentInput) {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("appointments")
    .insert({
      ...input,
      status: input.status ?? "booked",
      created_by_ai: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
