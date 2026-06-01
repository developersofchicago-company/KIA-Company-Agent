import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CAL_BASE = "https://api.cal.com/v2";

// Cal.com requires a different API version header per endpoint.
const CAL_API_VERSION = {
  eventTypes: "2024-06-14",
  slots: "2024-08-13",
  default: "2024-08-13",
} as const;

async function getCalendarConnection(supabase: ReturnType<typeof createServerSupabase>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("calcom_api_key, timezone")
    .eq("connected_by", user.id)
    .eq("provider", "calcom")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch calendar connection");
  if (!data?.calcom_api_key) throw new Error("No Cal.com connection found");

  return data;
}

async function calFetch<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {},
  apiVersion: string = CAL_API_VERSION.default,
): Promise<T> {
  const res = await fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? `Cal.com API error ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

/**
 * GET /api/cal
 * Returns Cal.com profile + event types.
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const connection = await getCalendarConnection(supabase);

    const [profileRes, eventTypesRes] = await Promise.all([
      calFetch<{
        status: string;
        data: {
          id: number;
          name: string;
          email: string;
          username: string;
          timeZone: string;
          avatarUrl: string;
        };
      }>("/me", connection.calcom_api_key, {}, CAL_API_VERSION.default),
      calFetch<{
        status: string;
        data: Array<{
          id: number;
          title: string;
          slug: string;
          lengthInMinutes: number;
          description: string | null;
          locations: { type: string; integration?: string }[];
          bookingUrl: string;
        }>;
      }>("/event-types", connection.calcom_api_key, {}, CAL_API_VERSION.eventTypes),
    ]);

    return NextResponse.json({
      profile: profileRes.data,
      eventTypes: eventTypesRes.data,
    });
  } catch (err) {
    console.error("[cal] error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cal
 * Body: { startTime, endTime, eventTypeId? }
 * Returns available slots.
 */
export async function POST(request: NextRequest) {
  try {
    const { startTime, endTime, eventTypeId } = await request.json();
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabase();
    const connection = await getCalendarConnection(supabase);

    // Get first event type if none specified
    let targetEventTypeId = eventTypeId;
    if (!targetEventTypeId) {
      const eventTypesRes = await calFetch<{
        status: string;
        data: Array<{ id: number }>;
      }>("/event-types", connection.calcom_api_key, {}, CAL_API_VERSION.eventTypes);
      if (!eventTypesRes.data?.length) {
        throw new Error("No event types configured in Cal.com");
      }
      targetEventTypeId = eventTypesRes.data[0].id;
    }

    const params = new URLSearchParams({
      startTime,
      endTime,
      eventTypeId: String(targetEventTypeId),
    });

    const slotsRes = await calFetch<{
      data: {
        slots: Record<string, Array<{ time: string }>>;
      };
    }>(`/slots/available?${params}`, connection.calcom_api_key, {}, CAL_API_VERSION.slots);

    return NextResponse.json({ slots: slotsRes.data.slots });
  } catch (err) {
    console.error("[cal] slots error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
