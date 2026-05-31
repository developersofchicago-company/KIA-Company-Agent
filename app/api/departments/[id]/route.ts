import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/departments/[id] — fetch a single department by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("departments")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data as Department);
}

/**
 * PATCH /api/departments/[id] — update a department.
 * Body: partial Department fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const updates = await request.json();
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("departments")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data as Department);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/departments/[id] — remove a department.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("departments")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
