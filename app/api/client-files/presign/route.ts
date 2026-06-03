import { NextRequest, NextResponse } from "next/server";
import { getPresignedPutUrl } from "@/lib/wasabi";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORIES = ["wave_recording", "sales_report", "training", "call_log", "other"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, fileSize, category = "other" } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const safeCategory = VALID_CATEGORIES.includes(category) ? category : "other";

    // Sanitize filename
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const wasabiKey = `kia-files/${safeCategory}/${timestamp}_${safeName}`;

    // Generate presigned URL for direct upload to Wasabi
    const { url, key } = await getPresignedPutUrl(wasabiKey, fileType, 300);

    return NextResponse.json({
      uploadUrl: url,
      key,
      fileName,
      category: safeCategory,
    });
  } catch (err) {
    console.error("[presign] error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
