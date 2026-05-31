import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Triggers Supabase's password-reset email flow.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const admin = createAdminSupabase();
    const origin = request.headers.get("origin") ?? request.nextUrl.origin;

    const { error } = await admin.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      console.error("[forgot-password]", error);
      // Don't leak whether the email exists
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[forgot-password] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
