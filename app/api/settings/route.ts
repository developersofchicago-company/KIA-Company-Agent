import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Setting } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings — fetch all settings rows.
 */
export async function GET() {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Setting[]);
}

/**
 * PATCH /api/settings — update one or more settings by key.
 * Body: { key: string, value: any }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { key, value } = await request.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data as Setting);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
