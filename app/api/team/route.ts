import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/team — list team members with their email (joined from auth.users).
 */
export async function GET() {
  const admin = createAdminSupabase();

  const { data: members, error } = await admin
    .from("team_members")
    .select("id, user_id, role, department_id, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map user_id -> email via the auth admin API.
  const { data: usersList } = await admin.auth.admin.listUsers();
  const emailById = new Map(
    (usersList?.users ?? []).map((u) => [u.id, u.email]),
  );

  const enriched = (members ?? []).map((m) => ({
    ...m,
    email: emailById.get(m.user_id as string) ?? null,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/team — invite a new team member by email.
 * Body: { email: string, role?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, role = "viewer" } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const admin = createAdminSupabase();

    // Invite (creates the auth user + sends an email if SMTP is configured).
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email);

    if (inviteErr || !invited?.user) {
      return NextResponse.json(
        { error: inviteErr?.message ?? "Failed to invite user" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("team_members")
      .insert({ user_id: invited.user.id, role })
      .select("id, user_id, role, department_id, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ...data, email }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
