import { formatDistanceToNowStrict } from "date-fns";

/**
 * "+92 21 1234 5678" style spacing for PK numbers, otherwise the raw value.
 * Returns the original string if it can't be parsed.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const trimmed = raw.trim();
  if (trimmed === "web-call") return "Web Call";
  if (trimmed === "unknown") return "Unknown";
  if (trimmed.startsWith("+92")) {
    const digits = trimmed.replace(/\D/g, "").slice(2); // strip "92"
    if (digits.length >= 9) {
      return `+92 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
  }
  // Generic E.164-ish prettifier: group last 10 digits as 3-3-4
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length > 11) {
    const cc = digits.slice(0, digits.length - 10);
    const rest = digits.slice(-10);
    return `${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  return trimmed;
}

/** 🇵🇰 for +92, 🌐 otherwise. Pure visual hint. */
export function phoneFlag(raw: string | null | undefined): string {
  if (!raw) return "📞";
  const t = raw.trim();
  if (t === "web-call") return "💻";
  if (t === "unknown") return "📞";
  if (t.startsWith("+92")) return "🇵🇰";
  if (t.startsWith("+1")) return "🇺🇸";
  if (t.startsWith("+44")) return "🇬🇧";
  return "🌐";
}

/** "2m 34s", "45s", "1h 12m 5s". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0 || Number.isNaN(seconds)) return "—";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** "2 mins ago" — wraps date-fns formatDistanceToNowStrict. */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return "—";
  }
}

/** Full ISO -> "Jan 5, 2026 at 14:32" */
export function formatFullTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** First N chars with ellipsis, transcript prefixes stripped. */
export function transcriptPreview(
  transcript: string | null | undefined,
  max = 60,
): string {
  if (!transcript) return "";
  const cleaned = transcript
    .replace(/\[(AI|User)\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trimEnd()}…`;
}

export interface TranscriptMessage {
  role: "ai" | "user";
  text: string;
}

/**
 * Parse the "\n[AI] foo\n[User] bar" or "AI: foo\nUser: bar" format the webhook writes into a list
 * of structured chat messages. Falls back to a single AI message if the
 * transcript has no role tags.
 */
export function parseTranscript(
  transcript: string | null | undefined,
): TranscriptMessage[] {
  if (!transcript) return [];
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  // Match either [AI], [User] OR AI:, User:
  const tagRe = /(?:\[(AI|User)\]|(AI|User):)\s*/gi;
  if (!tagRe.test(trimmed)) {
    return [{ role: "ai", text: trimmed }];
  }

  const out: TranscriptMessage[] = [];
  
  // Use a regex that matches the start of a message block
  // It looks for a newline (or start of string) followed by either [Role] or Role:
  const blockRe = /(?:^|\n)\s*(?:\[(AI|User)\]|(AI|User):)\s*/gi;
  
  // Find all matches to get indices
  const matches = Array.from(trimmed.matchAll(blockRe));
  
  if (matches.length === 0) {
    return [{ role: "ai", text: trimmed }];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    // The role is in capture group 1 (if brackets) or capture group 2 (if colon)
    const roleString = match[1] || match[2];
    const role: "ai" | "user" = /ai/i.test(roleString) ? "ai" : "user";
    
    // The text body starts after this match ends
    const startIdx = match.index + match[0].length;
    // And ends where the next match begins, or end of string
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : trimmed.length;
    
    const text = trimmed.slice(startIdx, endIdx).trim();
    if (text) {
      out.push({ role, text });
    }
  }

  return out.length ? out : [{ role: "ai", text: trimmed }];
}
