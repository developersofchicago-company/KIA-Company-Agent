import { NextRequest, NextResponse } from "next/server";
import { getEventTypes, getAvailableSlots, getCalProfile } from "@/lib/cal";

export const dynamic = "force-dynamic";

/**
 * GET /api/cal
 * Returns Cal.com profile + event types.
 */
export async function GET() {
  try {
    const [profile, eventTypes] = await Promise.all([
      getCalProfile(),
      getEventTypes(),
    ]);
    return NextResponse.json({ profile, eventTypes });
  } catch (err) {
    console.error("[cal] error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cal
 * Body: { startTime, endTime, eventTypeId? }
 * Returns available slots.
 */
export async function POST(request: NextRequest) {
  try {
    const { startTime, endTime, eventTypeId } = await request.json();
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 },
      );
    }
    const slots = await getAvailableSlots(startTime, endTime, eventTypeId);
    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[cal] slots error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
