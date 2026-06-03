import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { uploadToWasabi } from "@/lib/wasabi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Allow larger body size for file uploads
export const fetchCache = "force-no-store";

const VALID_CATEGORIES = ["wave_recording", "sales_report", "training", "call_log", "other"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "other";
    const notes = (formData.get("notes") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const safeCategory = VALID_CATEGORIES.includes(category) ? category : "other";

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const wasabiKey = `kia-files/${safeCategory}/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToWasabi(wasabiKey, buffer, file.type || "application/octet-stream");

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("client_files")
      .insert({
        file_name: file.name,
        wasabi_key: wasabiKey,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        category: safeCategory,
        notes: notes.trim() || null,
        uploaded_by: "KIA Motors",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[client-files/upload] error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
