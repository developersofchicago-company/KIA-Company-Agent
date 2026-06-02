import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getSignedDownloadUrl } from "@/lib/wasabi";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("client_files")
      .select("wasabi_key, file_name")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(data.wasabi_key, 3600);
    return NextResponse.json({ url, file_name: data.file_name });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
