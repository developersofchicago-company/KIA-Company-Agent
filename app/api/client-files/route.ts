import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const sort = searchParams.get("sort") ?? "created_at";
    const order = searchParams.get("order") ?? "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    const admin = createAdminSupabase();
    let query = admin.from("client_files").select("*", { count: "exact" });

    if (search) {
      query = query.ilike("file_name", `%${search}%`);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const validSortFields = ["created_at", "file_name", "file_size"];
    const sortField = validSortFields.includes(sort) ? sort : "created_at";
    query = query
      .order(sortField, { ascending: order === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ files: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
