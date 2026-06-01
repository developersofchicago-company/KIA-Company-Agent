import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/team/[id] — update a team member's role.
 * Body: { role: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { role } = await request.json();
    if (!role) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("team_members")
      .update({ role })
      .eq("id", params.id)
      .select("id, user_id, role, department_id, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/team/[id] — remove a team member (from team_members only;
 * the auth user account is left intact).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
