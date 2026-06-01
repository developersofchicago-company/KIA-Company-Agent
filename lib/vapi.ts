import type { VapiAssistant, VapiCall } from "@/lib/types";

export interface VapiPhoneNumber {
  id: string;
  number: string;
  name?: string;
  assistantId?: string;
  provider?: string;
  createdAt?: string;
}

const VAPI_BASE_URL = "https://api.vapi.ai";

class VapiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Vapi API error ${status}`);
    this.name = "VapiError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.VAPI_API_KEY;
  if (!key) {
    throw new Error("VAPI_API_KEY is not set in the environment");
  }
  return key;
}

async function vapiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${VAPI_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Vapi data changes frequently; never cache.
    cache: "no-store",
  });

  const text = await res.text();
  const body = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new VapiError(res.status, body, `Vapi ${init.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Assistants
// ---------------------------------------------------------------------------

export function getAssistants(): Promise<VapiAssistant[]> {
  return vapiFetch<VapiAssistant[]>("/assistant");
}

export function getAssistant(id: string): Promise<VapiAssistant> {
  return vapiFetch<VapiAssistant>(`/assistant/${id}`);
}

export function updateAssistant(
  id: string,
  config: Partial<VapiAssistant>,
): Promise<VapiAssistant> {
  return vapiFetch<VapiAssistant>(`/assistant/${id}`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

interface CreateOutboundCallOptions {
  /** Vapi phoneNumberId to call from. Required by Vapi for PSTN calls. */
  phoneNumberId?: string;
  /** Customer-facing name to display in Vapi UI. */
  customerName?: string;
}

export function createOutboundCall(
  phoneNumber: string,
  assistantId: string,
  options: CreateOutboundCallOptions = {},
): Promise<VapiCall> {
  return vapiFetch<VapiCall>("/call", {
    method: "POST",
    body: JSON.stringify({
      assistantId,
      phoneNumberId: options.phoneNumberId ?? process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: phoneNumber,
        ...(options.customerName ? { name: options.customerName } : {}),
      },
    }),
  });
}

export function getCall(vapiCallId: string): Promise<VapiCall> {
  return vapiFetch<VapiCall>(`/call/${vapiCallId}`);
}

export function vapiFetchCalls(limit = 100): Promise<VapiCall[]> {
  return vapiFetch<VapiCall[]>(`/call?limit=${limit}`);
}

export async function getCallRecording(vapiCallId: string): Promise<string | null> {
  const call = await getCall(vapiCallId);
  return call.recordingUrl ?? null;
}

// ---------------------------------------------------------------------------
// Phone Numbers
// ---------------------------------------------------------------------------

export function getPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiFetch<VapiPhoneNumber[]>("/phone-number");
}

export { VapiError };
