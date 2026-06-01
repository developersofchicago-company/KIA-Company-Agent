import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/connections
 * List all calendar connections for the authenticated user
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, provider, department_id, provider_account_email, default_duration, buffer_minutes, timezone, is_active, created_at, updated_at")
    .eq("connected_by", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ connections: data });
}

/**
 * POST /api/calendar/connections
 * Create a new calendar connection
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      provider,
      department_id,
      calcom_api_key,
      default_duration = 30,
      buffer_minutes = 0,
      timezone = "America/New_York",
    } = body;

    if (!calcom_api_key) {
      return NextResponse.json(
        { error: "Cal.com API key is required" },
        { status: 400 }
      );
    }

    // Validate the API key by fetching profile
    const profileRes = await fetch("https://api.cal.com/v2/me", {
      headers: { Authorization: `Bearer ${calcom_api_key}` },
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "Invalid Cal.com API key" },
        { status: 400 }
      );
    }

    const profile = await profileRes.json();

    const { data, error } = await supabase
      .from("calendar_connections")
      .insert({
        provider: "calcom",
        connected_by: user.id,
        department_id: department_id || null,
        calcom_api_key,
        provider_account_email: profile.data?.email || null,
        default_duration,
        buffer_minutes,
        timezone,
        is_active: true,
      })
      .select("id, provider, department_id, provider_account_email, default_duration, buffer_minutes, timezone, is_active, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
