import { NextResponse } from "next/server";
import { getAssistants, getPhoneNumbers } from "@/lib/vapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/vapi/resources
 * Returns all assistants and phone numbers from Vapi for use in dropdowns.
 */
export async function GET() {
  try {
    const [assistants, phoneNumbers] = await Promise.all([
      getAssistants(),
      getPhoneNumbers(),
    ]);
    return NextResponse.json({ assistants, phoneNumbers });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
