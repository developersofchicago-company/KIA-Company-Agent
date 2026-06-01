// ---------------------------------------------------------------------------
// Cal.com API v2 client — server-only
// ---------------------------------------------------------------------------

const CAL_BASE = "https://api.cal.com/v2";

// Cal.com requires a different API version header per endpoint.
const CAL_API_VERSION = {
  eventTypes: "2024-06-14",
  slots: "2024-08-13",
  bookings: "2024-08-13",
  default: "2024-08-13",
} as const;

function getApiKey(): string {
  const key = process.env.CAL_API_KEY;
  if (!key) throw new Error("CAL_API_KEY is not set in the environment");
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
): Promise<T> {
  const res = await fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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
export async function getEventTypes(): Promise<CalEventType[]> {
  const res = await calFetch<{ status: string; data: CalEventType[] }>(
    "/event-types",
    {},
    CAL_API_VERSION.eventTypes,
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
  );
  return res.data;
}

/** Get current user profile from Cal.com */
export async function getCalProfile() {
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
  }>("/me");
  return res.data;
}
