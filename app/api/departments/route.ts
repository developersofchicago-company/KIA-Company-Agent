import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/departments — list all departments ordered by name.
 */
export async function GET() {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as Department[]);
}

/**
 * POST /api/departments — create a new department.
 * Body: { name, phone_numbers?, hours_start?, hours_end?, languages?, routing_keywords? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("departments")
      .insert({
        name: body.name.trim(),
        phone_numbers: body.phone_numbers ?? [],
        hours_start: body.hours_start ?? null,
        hours_end: body.hours_end ?? null,
        languages: body.languages ?? ["urdu", "english"],
        routing_keywords: body.routing_keywords ?? [],
        backup_department_id: body.backup_department_id ?? null,
        is_active: body.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data as Department, { status: 201 });
  } catch (err) {
    console.error("[departments] create error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
