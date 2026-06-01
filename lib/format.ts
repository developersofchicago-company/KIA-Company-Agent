import { formatDistanceToNowStrict } from "date-fns";

/**
 * Normalize a raw phone number into E.164 format (e.g. +923352427803),
 * which Vapi requires. Handles common Pakistani input styles:
 *   03352427803    -> +923352427803
 *   3352427803     -> +923352427803
 *   923352427803   -> +923352427803
 *   +923352427803  -> +923352427803 (unchanged)
 * Numbers that already start with "+" are kept as-is (only spaces/dashes stripped).
 *
 * @param defaultCountryCode digits without "+" (default "92" for Pakistan)
 */
export function normalizePhoneE164(
  raw: string | null | undefined,
  defaultCountryCode = "92",
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already E.164 — just strip spaces/dashes/parens.
  if (trimmed.startsWith("+")) {
    const cleaned = "+" + trimmed.slice(1).replace(/\D/g, "");
    return cleaned.length >= 8 ? cleaned : null;
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Leading 0 = local format -> drop it and prepend country code.
  if (digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (!digits.startsWith(defaultCountryCode)) {
    // Bare local number without leading 0 -> assume default country.
    digits = defaultCountryCode + digits;
  }

  return digits.length >= 8 ? `+${digits}` : null;
}

/**
 * "+92 21 1234 5678" style spacing for PK numbers, otherwise the raw value.
 * Returns the original string if it can't be parsed.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const trimmed = raw.trim();
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
  if (raw.trim().startsWith("+92")) return "🇵🇰";
  if (raw.trim().startsWith("+1")) return "🇺🇸";
  if (raw.trim().startsWith("+44")) return "🇬🇧";
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
 * Parse the "\n[AI] foo\n[User] bar" format the webhook writes into a list
 * of structured chat messages. Falls back to a single AI message if the
 * transcript has no role tags.
 */
export function parseTranscript(
  transcript: string | null | undefined,
): TranscriptMessage[] {
  if (!transcript) return [];
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  const tagRe = /\[(AI|User)\]\s*/gi;
  if (!tagRe.test(trimmed)) {
    return [{ role: "ai", text: trimmed }];
  }

  const out: TranscriptMessage[] = [];
  const parts = trimmed.split(/\n?\[(AI|User)\]\s*/gi);
  // split returns [pre, tag1, body1, tag2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const tag = parts[i];
    const body = parts[i + 1]?.trim();
    if (!body) continue;
    out.push({
      role: /ai/i.test(tag) ? "ai" : "user",
      text: body,
    });
  }
  return out.length ? out : [{ role: "ai", text: trimmed }];
}
