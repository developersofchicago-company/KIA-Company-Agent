export type Language = "urdu" | "english";
export type CallDirection = "inbound" | "outbound";
export type CallStatus = "completed" | "missed" | "failed" | "in_progress";
export type TeamRole = "admin" | "manager" | "viewer";

export interface Department {
  id: string;
  name: string;
  phone_numbers: string[];
  hours_start: string | null;
  hours_end: string | null;
  languages: Language[];
  routing_keywords: string[] | null;
  backup_department_id: string | null;
  vapi_assistant_id: string | null;
  vapi_assistant_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Call {
  id: string;
  vapi_call_id: string | null;
  phone_number: string;
  caller_name: string | null;
  direction: CallDirection | null;
  status: CallStatus | null;
  language_selected: Language | null;
  department_id: string | null;
  department_selected: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  recording_url: string | null;
  ai_confidence: number | null;
  cost: number | null;
  notes: string | null;
  tags: string[] | null;
  ivr_completed_at: string | null;
  ai_started_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  phone_number: string;
  name: string | null;
  email: string | null;
  tags: string[] | null;
  last_called_at: string | null;
  total_calls: number;
  created_at: string;
}

export interface Setting<T = unknown> {
  id: string;
  key: string;
  value: T | null;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string | null;
  role: TeamRole | null;
  department_id: string | null;
  created_at: string;
}

export interface CallFilters {
  status?: CallStatus;
  direction?: CallDirection;
  language?: Language;
  departmentId?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export type NewCall = Omit<Call, "id" | "created_at">;
export type CallUpdate = Partial<NewCall>;

// ============================================================================
// Vapi types
// ============================================================================
// Vapi sends webhooks shaped as { message: { type, call, ... } }.
// We type the fields we actually read; the rest passes through as unknown.

export type VapiCallType =
  | "inboundPhoneCall"
  | "outboundPhoneCall"
  | "webCall";

export type VapiCallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "forwarding"
  | "ended";

export interface VapiCall {
  id: string;
  orgId?: string;
  type?: VapiCallType;
  status?: VapiCallStatus;
  assistantId?: string;
  phoneNumberId?: string;
  customer?: {
    number?: string;
    name?: string;
    email?: string;
  };
  phoneNumber?: {
    number?: string;
    name?: string;
  };
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  cost?: number;
  costBreakdown?: Record<string, number>;
  successEvaluation?: string;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VapiAssistant {
  id: string;
  orgId?: string;
  name?: string;
  firstMessage?: string;
  voice?: { provider?: string; voiceId?: string };
  model?: {
    provider?: string;
    model?: string;
    temperature?: number;
    systemPrompt?: string;
    messages?: Array<{ role: string; content: string }>;
  };
  transcriber?: {
    provider?: string;
    model?: string;
    language?: string;
  };
  serverUrl?: string;
  endCallFunctionEnabled?: boolean;
  recordingEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface VapiBaseMessage {
  call?: VapiCall;
  timestamp?: number | string;
}

export interface VapiStatusUpdateMessage extends VapiBaseMessage {
  type: "status-update";
  status?: VapiCallStatus;
  endedReason?: string;
}

export interface VapiTranscriptMessage extends VapiBaseMessage {
  type: "transcript";
  role?: "assistant" | "user";
  transcriptType?: "partial" | "final";
  transcript?: string;
}

export interface VapiFunctionCallMessage extends VapiBaseMessage {
  type: "function-call";
  functionCall?: {
    name: string;
    parameters?: Record<string, unknown>;
  };
}

export interface VapiToolCallsMessage extends VapiBaseMessage {
  type: "tool-calls";
  toolCalls?: Array<{
    id?: string;
    type?: string;
    function?: {
      name: string;
      arguments?: string | Record<string, unknown>;
    };
  }>;
}

export interface VapiEndOfCallReportMessage extends VapiBaseMessage {
  type: "end-of-call-report";
  endedReason?: string;
  recordingUrl?: string;
  summary?: string;
  transcript?: string;
  messages?: Array<{ role: string; message?: string; content?: string }>;
  analysis?: {
    summary?: string;
    successEvaluation?: string | number | boolean;
    structuredData?: Record<string, unknown>;
  };
  durationSeconds?: number;
}

export type VapiMessage =
  | VapiStatusUpdateMessage
  | VapiTranscriptMessage
  | VapiFunctionCallMessage
  | VapiToolCallsMessage
  | VapiEndOfCallReportMessage
  | ({ type: string } & VapiBaseMessage);

export interface VapiWebhookEvent {
  message: VapiMessage;
}

// ============================================================================
// Calendar Integration Types
// ============================================================================

export type CalendarProvider = "google" | "calcom" | "calendly";

export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  connected_by: string;
  department_id: string | null;
  provider_account_email: string | null;
  default_duration: number;
  buffer_minutes: number;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  calendar_connection_id: string;
  call_id: string | null;
  contact_id: string | null;
  provider_event_id: string | null;
  provider_booking_url: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
}
