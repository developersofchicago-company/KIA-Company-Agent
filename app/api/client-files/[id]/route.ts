import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { deleteFromWasabi } from "@/lib/wasabi";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const admin = createAdminSupabase();

    const { data, error: fetchError } = await admin
      .from("client_files")
      .select("wasabi_key")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await deleteFromWasabi(data.wasabi_key);

    const { error: deleteError } = await admin
      .from("client_files")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[client-files/delete] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
