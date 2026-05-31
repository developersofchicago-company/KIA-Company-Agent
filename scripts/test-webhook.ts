/**
 * scripts/test-webhook.ts
 *
 * Smoke-tests the Vapi webhook by:
 *   1. Sending a fake status-update (in-progress) -> expects a calls row
 *   2. Sending a fake transcript event           -> expects transcript appended
 *   3. Sending a fake end-of-call-report         -> expects row updated + contact row
 *   4. Cleaning up the test rows
 *
 * Reads VAPI_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * from .env.local.
 *
 * Run:
 *   npx tsx scripts/test-webhook.ts
 *
 * Override webhook URL:
 *   WEBHOOK_URL=http://localhost:3000/api/vapi/webhook npx tsx scripts/test-webhook.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Bootstrap env (minimal .env parser; avoids dotenv dep)
// ---------------------------------------------------------------------------

function loadEnv(file: string) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

loadEnv(".env.local");
loadEnv(".env");

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ?? "http://localhost:3000/api/vapi/webhook";
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VAPI_CALL_ID = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const PHONE = "+19998880000";
const STARTED_AT = new Date(Date.now() - 60_000).toISOString();
const ENDED_AT = new Date().toISOString();

const baseCall = {
  id: VAPI_CALL_ID,
  type: "inboundPhoneCall",
  status: "in-progress",
  customer: { number: PHONE, name: "Test Caller" },
  startedAt: STARTED_AT,
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function postEvent(message: Record<string, unknown>): Promise<void> {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vapi-Secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify({ message }),
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`POST ${message.type} failed: ${res.status} ${body}`);
  }
  console.log(`  -> POST ${message.type}: ${res.status} ${body}`);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

async function fetchCall() {
  const { data, error } = await admin
    .from("calls")
    .select("*")
    .eq("vapi_call_id", VAPI_CALL_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchContact() {
  const { data, error } = await admin
    .from("contacts")
    .select("*")
    .eq("phone_number", PHONE)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Test flow
// ---------------------------------------------------------------------------

async function cleanup() {
  await admin.from("calls").delete().eq("vapi_call_id", VAPI_CALL_ID);
  await admin.from("contacts").delete().eq("phone_number", PHONE);
}

async function main() {
  console.log(`Target: ${WEBHOOK_URL}`);
  console.log(`Test call id: ${VAPI_CALL_ID}\n`);

  await cleanup(); // start from a clean slate

  // 1. Status update: in-progress
  console.log("[1/3] status-update (in-progress)");
  await postEvent({
    type: "status-update",
    status: "in-progress",
    call: baseCall,
  });

  const started = await fetchCall();
  assert(started, "expected a calls row after status-update");
  assert(started.status === "in_progress", `status was ${started.status}`);
  assert(started.phone_number === PHONE, "phone_number mismatch");
  console.log(`  ok: calls row created, id=${started.id}\n`);

  // 2. Transcript (final)
  console.log("[2/3] transcript (final)");
  await postEvent({
    type: "transcript",
    role: "user",
    transcriptType: "final",
    transcript: "Hello, I would like to speak with sales.",
    call: baseCall,
  });

  const withTranscript = await fetchCall();
  assert(
    withTranscript?.transcript?.includes("Hello, I would like to speak"),
    `transcript not appended (got: ${withTranscript?.transcript ?? "null"})`,
  );
  console.log(`  ok: transcript appended\n`);

  // 3. End of call report
  console.log("[3/3] end-of-call-report");
  await postEvent({
    type: "end-of-call-report",
    endedReason: "customer-ended-call",
    transcript: "Hello, I would like to speak with sales.\nThank you, goodbye.",
    recordingUrl: "https://example.com/fake-recording.mp3",
    durationSeconds: 42,
    call: { ...baseCall, status: "ended", endedAt: ENDED_AT },
  });

  const ended = await fetchCall();
  assert(ended?.status === "completed", `expected status=completed, got ${ended?.status}`);
  assert(ended?.duration_seconds === 42, `duration was ${ended?.duration_seconds}`);
  assert(ended?.recording_url, "recording_url missing");

  const contact = await fetchContact();
  assert(contact, "expected a contact row to be created");
  assert(contact.total_calls === 1, `total_calls=${contact.total_calls}`);
  assert(contact.last_called_at, "last_called_at missing");
  console.log(`  ok: row updated; contact created (total_calls=${contact.total_calls})\n`);

  console.log("All assertions passed. Cleaning up...");
  await cleanup();
  console.log("Done.");
}

main()
  .catch(async (err) => {
    console.error("\nFAILED:", err.message ?? err);
    try {
      await cleanup();
    } catch {}
    process.exit(1);
  });
