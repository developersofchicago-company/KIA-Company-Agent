import { NextRequest } from "next/server";

import { getAssistant, updateAssistant } from "@/lib/vapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const assistantId = url.searchParams.get("assistantId") ?? process.env.VAPI_ASSISTANT_ID;
  if (!assistantId) {
    return new Response("Missing assistant ID", { status: 400 });
  }
  try {
    const assistant = await getAssistant(assistantId);
    return new Response(JSON.stringify(assistant), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const url = new URL(request.url);
  const assistantId = url.searchParams.get("assistantId") ?? process.env.VAPI_ASSISTANT_ID;
  if (!assistantId) {
    return new Response("Missing assistant ID", { status: 400 });
  }
  const body = await request.json();
  try {
    const updated = await updateAssistant(assistantId, body);
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
