import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";

import { EXPIRY_WARNING_DAYS } from "@/lib/flight/constants";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

export function formatDate(value: string | Date | null | undefined, pattern = "d MMM yyyy") {
  const d = toDate(value);
  return d ? format(d, pattern) : "—";
}

export function formatDateTime(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy 'at' HH:mm") : "—";
}

/** "3 minutes ago" / "in 2 hours". Used across the activity feed and queue. */
export function formatRelative(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return "—";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export type ExpiryState = "valid" | "expiring" | "expired" | "unknown";

export interface ExpiryInfo {
  state: ExpiryState;
  days: number | null;
  label: string;
}

/**
 * Classify a currency document (BFR, medical). Drives the amber/red chips on
 * the pilot summary and the instructor's approval screen — an instructor should
 * never have to do this arithmetic in their head.
 */
export function getExpiryInfo(value: string | Date | null | undefined): ExpiryInfo {
  const d = toDate(value);
  if (!d) return { state: "unknown", days: null, label: "Not provided" };

  const days = differenceInCalendarDays(d, new Date());

  if (days < 0) {
    const past = Math.abs(days);
    return {
      state: "expired",
      days,
      label: `${past} day${past === 1 ? "" : "s"} ago`,
    };
  }
  if (days === 0) {
    return { state: "expiring", days, label: "Expires today" };
  }
  if (days <= EXPIRY_WARNING_DAYS) {
    return {
      state: "expiring",
      days,
      label: `${days} day${days === 1 ? "" : "s"} to go`,
    };
  }
  return {
    state: "valid",
    days,
    label: `${days} day${days === 1 ? "" : "s"} to go`,
  };
}

export function initials(name: string | null | undefined) {
  if (!name) return "··";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Combine a date (yyyy-MM-dd) and a time (HH:mm) from the form into a real
 * timestamp. If the time is earlier than now on the same day we assume the
 * pilot means later today, not yesterday.
 */
export function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const combined = new Date(`${date}T${time}:00`);
  return isValid(combined) ? combined.toISOString() : null;
}

/**
 * Parse times pilots actually type: "1415", "2:15pm", "2.15", "14:15", "2p".
 * Returns canonical 24h `HH:mm`, or null if unrecognisable.
 */
export function parseFlexibleTime(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return null;

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return raw;

  let ampm: "am" | "pm" | null = null;
  let body = raw;

  if (body.endsWith("am") || body.endsWith("pm")) {
    ampm = body.slice(-2) as "am" | "pm";
    body = body.slice(0, -2);
  } else if (body.endsWith("a") || body.endsWith("p")) {
    ampm = body.endsWith("a") ? "am" : "pm";
    body = body.slice(0, -1);
  }

  body = body.replace(".", ":").replace(",", ":");

  let hours: number;
  let minutes: number;

  if (body.includes(":")) {
    const [hPart, mPart = "0"] = body.split(":");
    if (!/^\d{1,2}$/.test(hPart) || !/^\d{1,2}$/.test(mPart)) return null;
    hours = Number(hPart);
    minutes = Number(mPart.padEnd(2, "0").slice(0, 2));
  } else if (/^\d{3,4}$/.test(body)) {
    const padded = body.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2));
  } else if (/^\d{1,2}$/.test(body)) {
    hours = Number(body);
    minutes = 0;
  } else {
    return null;
  }

  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = ampm === "am" ? 0 : 12;
    else if (ampm === "pm") hours += 12;
  }

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Friendly 12h label for a stored `HH:mm` value, e.g. "2:15 PM". */
export function formatTimeLabel(time: string): string {
  const parsed = parseFlexibleTime(time);
  if (!parsed) return time;
  const [hStr, mStr] = parsed.split(":");
  let hours = Number(hStr);
  const minutes = mStr;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

/** Round a Date up to the next N minutes and return `HH:mm`. */
export function roundTimeToMinutes(date: Date, step = 5): string {
  const ms = 60_000 * step;
  const rounded = new Date(Math.ceil(date.getTime() / ms) * ms);
  return `${String(rounded.getHours()).padStart(2, "0")}:${String(rounded.getMinutes()).padStart(2, "0")}`;
}

/** Form name frozen on the authorisation (snapshot), or a safe fallback. */
export function getAuthorisationFormName(
  templateSnapshot: { name?: string | null } | null | undefined,
): string {
  const name = templateSnapshot?.name?.trim();
  return name || "Unknown form";
}
