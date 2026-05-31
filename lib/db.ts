import { supabase } from "@/lib/supabase";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type {
  Call,
  CallFilters,
  CallUpdate,
  Contact,
  Department,
  NewCall,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// User-facing reads (use the cookie-aware client)
// ============================================================================

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function getCalls(filters: CallFilters = {}): Promise<Call[]> {
  let query = supabase
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.direction) query = query.eq("direction", filters.direction);
  if (filters.language) query = query.eq("language_selected", filters.language);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `phone_number.ilike.${term},caller_name.ilike.${term},transcript.ilike.${term}`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Call[];
}

export async function getCallById(id: string): Promise<Call | null> {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Call) ?? null;
}

export async function createCall(data: NewCall): Promise<Call> {
  const { data: row, error } = await supabase
    .from("calls")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return row as Call;
}

export async function updateCall(id: string, data: CallUpdate): Promise<Call> {
  const { data: row, error } = await supabase
    .from("calls")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return row as Call;
}

// ============================================================================
// Server-side filtered queries (RLS-aware via passed client)
// ============================================================================

export interface CallsQuery {
  search?: string;
  departmentId?: string;
  direction?: "inbound" | "outbound";
  status?: "completed" | "missed" | "failed" | "in_progress";
  language?: "urdu" | "english";
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
  limit?: number;
  offset?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCallsFilters(query: any, filters: CallsQuery): any {
  let q = query;
  if (filters.status)       q = q.eq("status", filters.status);
  if (filters.direction)    q = q.eq("direction", filters.direction);
  if (filters.language)     q = q.eq("language_selected", filters.language);
  if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
  if (filters.dateFrom)     q = q.gte("created_at", filters.dateFrom);
  if (filters.dateTo)       q = q.lte("created_at", filters.dateTo);
  if (filters.search) {
    const term = `%${filters.search}%`;
    q = q.or(
      `phone_number.ilike.${term},caller_name.ilike.${term},transcript.ilike.${term}`,
    );
  }
  return q;
}

export async function getCallsWithFilters(
  client: SupabaseClient,
  filters: CallsQuery = {},
): Promise<Call[]> {
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = client
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false });

  query = applyCallsFilters(query, filters);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Call[];
}

export async function getCallsCount(
  client: SupabaseClient,
  filters: CallsQuery = {},
): Promise<number> {
  let query = client
    .from("calls")
    .select("id", { count: "exact", head: true });

  query = applyCallsFilters(query, filters);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getCallsForExport(
  client: SupabaseClient,
  filters: CallsQuery = {},
  hardLimit = 5000,
): Promise<Call[]> {
  let query = client
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(hardLimit);

  query = applyCallsFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Call[];
}

/**
 * Other calls from the same phone_number, excluding the current call.
 */
export async function getCallerHistory(
  client: SupabaseClient,
  phoneNumber: string,
  excludeCallId: string,
  limit = 10,
): Promise<Call[]> {
  const { data, error } = await client
    .from("calls")
    .select("*")
    .eq("phone_number", phoneNumber)
    .neq("id", excludeCallId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Call[];
}

// ============================================================================
// CSV
// ============================================================================

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function callsToCsv(calls: Call[]): string {
  const header = [
    "Date",
    "Time",
    "Phone",
    "Name",
    "Direction",
    "Department",
    "Duration (s)",
    "Status",
    "Transcript",
  ];
  const rows = calls.map((c) => {
    const d = c.created_at ? new Date(c.created_at) : null;
    const date = d ? d.toISOString().slice(0, 10) : "";
    const time = d ? d.toISOString().slice(11, 19) : "";
    const transcript = (c.transcript ?? "").replace(/\s+/g, " ").trim();
    return [
      date,
      time,
      c.phone_number ?? "",
      c.caller_name ?? "",
      c.direction ?? "",
      c.department_selected ?? "",
      c.duration_seconds ?? "",
      c.status ?? "",
      transcript,
    ].map(csvCell).join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}

// ============================================================================
// Dashboard
// ============================================================================

import {
  endOfDay,
  startOfDay,
  subDays,
} from "date-fns";

export interface DashboardStats {
  totalCallsToday: number;
  totalCallsYesterday: number;
  inboundToday: number;
  outboundToday: number;
  avgDurationToday: number;     // seconds
  avgDurationYesterday: number; // seconds
  missedToday: number;
  missedYesterday: number;
  totalChangePct: number | null;
  avgDurationChangePct: number | null;
  missedChangePct: number | null;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export async function getDashboardStats(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<DashboardStats> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterday = subDays(now, 1);
  const ydayStart = startOfDay(yesterday);
  const ydayEnd = endOfDay(yesterday);

  const [todayRes, ydayRes] = await Promise.all([
    client
      .from("calls")
      .select("status, direction, duration_seconds")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString()),
    client
      .from("calls")
      .select("status, duration_seconds")
      .gte("created_at", ydayStart.toISOString())
      .lte("created_at", ydayEnd.toISOString()),
  ]);

  if (todayRes.error) throw todayRes.error;
  if (ydayRes.error) throw ydayRes.error;

  const today = (todayRes.data ?? []) as Array<{
    status: string | null;
    direction: string | null;
    duration_seconds: number | null;
  }>;
  const yday = (ydayRes.data ?? []) as Array<{
    status: string | null;
    duration_seconds: number | null;
  }>;

  const isMissed = (s: string | null) => s === "missed" || s === "failed";

  const totalCallsToday = today.length;
  const totalCallsYesterday = yday.length;
  const inboundToday = today.filter((c) => c.direction === "inbound").length;
  const outboundToday = today.filter((c) => c.direction === "outbound").length;

  const completedToday = today
    .filter((c) => c.status === "completed")
    .map((c) => c.duration_seconds ?? 0);
  const completedYesterday = yday
    .filter((c) => c.status === "completed")
    .map((c) => c.duration_seconds ?? 0);

  const avgDurationToday = avg(completedToday);
  const avgDurationYesterday = avg(completedYesterday);
  const missedToday = today.filter((c) => isMissed(c.status)).length;
  const missedYesterday = yday.filter((c) => isMissed(c.status)).length;

  return {
    totalCallsToday,
    totalCallsYesterday,
    inboundToday,
    outboundToday,
    avgDurationToday,
    avgDurationYesterday,
    missedToday,
    missedYesterday,
    totalChangePct: pctChange(totalCallsToday, totalCallsYesterday),
    avgDurationChangePct: pctChange(avgDurationToday, avgDurationYesterday),
    missedChangePct: pctChange(missedToday, missedYesterday),
  };
}

export interface ActivityBucket {
  hour: number;       // 0-23
  label: string;      // "8 AM"
  count: number;
}

const HOURS_START = 8;
const HOURS_END = 20; // exclusive: 8AM..7PM = 12 buckets

function hourLabel(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${ampm}`;
}

export async function getCallsActivityToday(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<ActivityBucket[]> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const { data, error } = await client
    .from("calls")
    .select("created_at")
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString());

  if (error) throw error;

  const counts = new Array(24).fill(0);
  for (const row of (data ?? []) as Array<{ created_at: string }>) {
    const h = new Date(row.created_at).getHours();
    counts[h]++;
  }

  const buckets: ActivityBucket[] = [];
  for (let h = HOURS_START; h < HOURS_END; h++) {
    buckets.push({ hour: h, label: hourLabel(h), count: counts[h] });
  }
  return buckets;
}

export interface DepartmentBreakdownRow {
  departmentId: string | null;
  departmentName: string;
  count: number;
}

export async function getCallsByDepartment(
  client: SupabaseClient,
  days = 7,
): Promise<DepartmentBreakdownRow[]> {
  const start = startOfDay(subDays(new Date(), days - 1)).toISOString();

  const [{ data: callsData, error: callsErr }, { data: deptsData, error: deptsErr }] =
    await Promise.all([
      client
        .from("calls")
        .select("department_id, department_selected")
        .gte("created_at", start),
      client.from("departments").select("id, name"),
    ]);

  if (callsErr) throw callsErr;
  if (deptsErr) throw deptsErr;

  const nameById = new Map<string, string>();
  for (const d of (deptsData ?? []) as Array<{ id: string; name: string }>) {
    nameById.set(d.id, d.name);
  }

  const counts = new Map<string, { name: string; count: number; id: string | null }>();
  for (const row of (callsData ?? []) as Array<{
    department_id: string | null;
    department_selected: string | null;
  }>) {
    let key: string;
    let name: string;
    let id: string | null;
    if (row.department_id && nameById.has(row.department_id)) {
      key = row.department_id;
      name = nameById.get(row.department_id)!;
      id = row.department_id;
    } else if (row.department_selected) {
      key = `name:${row.department_selected.toLowerCase()}`;
      name = row.department_selected;
      id = null;
    } else {
      key = "__unassigned__";
      name = "Unassigned";
      id = null;
    }
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { name, count: 1, id });
  }

  return Array.from(counts.values())
    .map((v) => ({ departmentId: v.id, departmentName: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentCalls(
  client: SupabaseClient,
  limit = 10,
): Promise<Call[]> {
  const { data, error } = await client
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Call[];
}

// ============================================================================
// Contacts
// ============================================================================

export async function getContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("last_called_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Contact[];
}

// ============================================================================
// Webhook writes (service-role; bypass RLS)
// ============================================================================

interface SaveVapiCallInput {
  vapi_call_id: string;
  phone_number: string;
  direction: "inbound" | "outbound";
  caller_name?: string | null;
  department_id?: string | null;
  started_at?: string | null;
}

/**
 * Insert a new row when a Vapi call starts. Idempotent on vapi_call_id —
 * a duplicate start event returns the existing row instead of failing.
 */
export async function saveVapiCall(input: SaveVapiCallInput): Promise<Call> {
  const admin = createAdminSupabase();

  // Try to enrich from contacts (department from last interaction, name).
  const department_id: string | null = input.department_id ?? null;
  let caller_name: string | null = input.caller_name ?? null;

  const { data: existingContact } = await admin
    .from("contacts")
    .select("name, tags")
    .eq("phone_number", input.phone_number)
    .maybeSingle();

  if (existingContact?.name && !caller_name) caller_name = existingContact.name;

  const { data, error } = await admin
    .from("calls")
    .upsert(
      {
        vapi_call_id: input.vapi_call_id,
        phone_number: input.phone_number,
        direction: input.direction,
        status: "in_progress",
        caller_name,
        department_id,
        started_at: input.started_at ?? new Date().toISOString(),
      },
      { onConflict: "vapi_call_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as Call;
}

/**
 * Update an existing call row by vapi_call_id (e.g. on end-of-call-report).
 */
export async function updateCallFromWebhook(
  vapiCallId: string,
  data: CallUpdate,
): Promise<Call | null> {
  const admin = createAdminSupabase();
  const { data: row, error } = await admin
    .from("calls")
    .update(data)
    .eq("vapi_call_id", vapiCallId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (row as Call) ?? null;
}

/**
 * Append a chunk of text to the transcript field, atomically.
 * Falls back to fetch-modify-write if rpc isn't available.
 */
export async function appendTranscript(
  vapiCallId: string,
  text: string,
): Promise<void> {
  if (!text) return;
  const admin = createAdminSupabase();

  const { data: current, error: readErr } = await admin
    .from("calls")
    .select("transcript")
    .eq("vapi_call_id", vapiCallId)
    .maybeSingle();

  if (readErr) throw readErr;

  const next = `${(current?.transcript as string | null) ?? ""}${text}`;
  const { error: writeErr } = await admin
    .from("calls")
    .update({ transcript: next })
    .eq("vapi_call_id", vapiCallId);

  if (writeErr) throw writeErr;
}

interface UpsertContactInput {
  name?: string | null;
  email?: string | null;
  tags?: string[] | null;
  /** When true (default), increment total_calls and bump last_called_at. */
  recordCall?: boolean;
  lastCalledAt?: string;
}

/**
 * Create or update a contact by phone_number. When recordCall is true,
 * bumps total_calls and last_called_at.
 */
export async function upsertContact(
  phoneNumber: string,
  data: UpsertContactInput = {},
): Promise<Contact> {
  const admin = createAdminSupabase();
  const recordCall = data.recordCall ?? true;
  const lastCalledAt = data.lastCalledAt ?? new Date().toISOString();

  const { data: existing } = await admin
    .from("contacts")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (data.name && !existing.name) patch.name = data.name;
    if (data.email && !existing.email) patch.email = data.email;
    if (data.tags?.length) {
      const merged = Array.from(
        new Set([...(existing.tags ?? []), ...data.tags]),
      );
      patch.tags = merged;
    }
    if (recordCall) {
      patch.total_calls = (existing.total_calls ?? 0) + 1;
      patch.last_called_at = lastCalledAt;
    }

    if (Object.keys(patch).length === 0) return existing as Contact;

    const { data: updated, error } = await admin
      .from("contacts")
      .update(patch)
      .eq("phone_number", phoneNumber)
      .select("*")
      .single();
    if (error) throw error;
    return updated as Contact;
  }

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      phone_number: phoneNumber,
      name: data.name ?? null,
      email: data.email ?? null,
      tags: data.tags ?? null,
      total_calls: recordCall ? 1 : 0,
      last_called_at: recordCall ? lastCalledAt : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return created as Contact;
}
