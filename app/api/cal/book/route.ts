import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/cal";

export const dynamic = "force-dynamic";

/**
 * POST /api/cal/book
 * Body: { start, name, email, timeZone?, eventTypeId? }
 * Creates a Cal.com booking.
 */
export async function POST(request: NextRequest) {
  try {
    const { start, name, email, timeZone, eventTypeId } = await request.json();

    if (!start || !name || !email) {
      return NextResponse.json(
        { error: "start, name, and email are required" },
        { status: 400 },
      );
    }

    const booking = await createBooking(
      start,
      {
        name,
        email,
        timeZone: timeZone ?? "America/Chicago",
      },
      eventTypeId,
    );

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error("[cal/book] error", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
