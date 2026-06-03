import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORIES = ["wave_recording", "sales_report", "training", "call_log", "other"];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key, fileName, fileSize, fileType, category = "other", notes = "" } = body;

    if (!key || !fileName) {
      return NextResponse.json(
        { error: "key and fileName are required" },
        { status: 400 }
      );
    }

    const safeCategory = VALID_CATEGORIES.includes(category) ? category : "other";

    // Save file record to database
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("client_files")
      .insert({
        file_name: fileName,
        wasabi_key: key,
        file_size: fileSize || 0,
        file_type: fileType || "application/octet-stream",
        category: safeCategory,
        notes: notes.trim() || null,
        uploaded_by: user.user_metadata?.full_name || user.email || "Unknown",
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[confirm] database error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[confirm] error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
