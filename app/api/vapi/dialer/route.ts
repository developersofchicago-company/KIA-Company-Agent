// File: app/api/vapi/dialer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOutboundCall } from "@/lib/vapi";
import { normalizePhoneE164 } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/vapi/dialer
 * Body: { phoneNumber: string, callerName?: string }
 * Calls Vapi to start an outbound call using the provided assistant ID.
 */
export async function POST(request: NextRequest) {
  try {
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!assistantId) {
      return NextResponse.json(
        { error: "VAPI_ASSISTANT_ID is not configured. Add it to .env.local." },
        { status: 503 },
      );
    }
    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "VAPI_PHONE_NUMBER_ID is not configured. Add it to .env.local." },
        { status: 503 },
      );
    }

    const { phoneNumber, callerName } = await request.json();
    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
    }

    // Normalize to E.164 (Vapi requirement). e.g. 03352427803 -> +923352427803
    const e164 = normalizePhoneE164(phoneNumber);
    if (!e164) {
      return NextResponse.json(
        { error: "Invalid phone number. Use format like 03352427803 or +923352427803." },
        { status: 400 },
      );
    }

    const call = await createOutboundCall(e164, assistantId, {
      phoneNumberId,
      customerName: callerName,
    });
    return NextResponse.json({ success: true, call }, { status: 200 });
  } catch (err) {
    console.error("[dialer] error", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
