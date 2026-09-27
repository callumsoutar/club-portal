import type { AuthorisationStatus, LicenceType } from "@/lib/flight/types";

export const APP_NAME = "FlightAuth";
export const APP_TAGLINE = "Flight authorisations, sorted.";

/**
 * Status presentation. Kept in one place so a badge, a table row and a
 * dashboard tile can never disagree about what "pending" looks like.
 */
export const STATUS_META: Record<
  AuthorisationStatus,
  { label: string; description: string; tone: Tone }
> = {
  draft: {
    label: "Draft",
    description: "Not submitted yet",
    tone: "neutral",
  },
  submitted: {
    label: "Submitted",
    description: "Waiting to be picked up",
    tone: "info",
  },
  pending: {
    label: "Pending",
    description: "With an instructor for review",
    tone: "warning",
  },
  approved: {
    label: "Approved",
    description: "Cleared to fly",
    tone: "success",
  },
  declined: {
    label: "Declined",
    description: "Not authorised",
    tone: "danger",
  },
  cancelled: {
    label: "Archived",
    description: "Not flying — withdrawn",
    tone: "neutral",
  },
  expired: {
    label: "Expired",
    description: "Not actioned in time",
    tone: "neutral",
  },
  completed: {
    label: "Completed",
    description: "Flight finished, aircraft back",
    tone: "success",
  },
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Tailwind classes per tone. Used by Badge, StatTile and timeline dots.
 *  Status labels stay quiet — colour lives in the dot. */
export const TONE_CLASSES: Record<Tone, { badge: string; dot: string; soft: string }> = {
  neutral: {
    badge: "text-muted-foreground",
    dot: "bg-muted-foreground",
    soft: "bg-muted",
  },
  info: {
    badge: "text-muted-foreground",
    dot: "bg-info",
    soft: "bg-info-muted",
  },
  success: {
    badge: "text-muted-foreground",
    dot: "bg-success",
    soft: "bg-success-muted",
  },
  warning: {
    badge: "text-muted-foreground",
    dot: "bg-warning",
    soft: "bg-warning-muted",
  },
  danger: {
    badge: "text-destructive",
    dot: "bg-destructive",
    soft: "bg-danger-muted",
  },
};

/** Statuses that mean the aircraft is out and we are expecting it back. */
export const AIRBORNE_STATUSES: AuthorisationStatus[] = ["approved"];

/** Statuses an instructor still has to act on. */
export const ACTIONABLE_STATUSES: AuthorisationStatus[] = ["submitted", "pending"];

export const LICENCE_LABELS: Record<LicenceType, string> = {
  student: "Student Pilot",
  rpl: "Recreational Pilot Licence",
  ppl: "Private Pilot Licence",
  cpl: "Commercial Pilot Licence",
  atpl: "Airline Transport Pilot Licence",
  instructor: "Instructor Rating",
};

export const LICENCE_SHORT: Record<LicenceType, string> = {
  student: "Student",
  rpl: "RPL",
  ppl: "PPL",
  cpl: "CPL",
  atpl: "ATPL",
  instructor: "Instructor",
};

/** Currency documents expiring inside this window trigger a soft warning. */
export const EXPIRY_WARNING_DAYS = 30;

/** localStorage key for the auto-saved wizard draft (legacy single-slot). */
export const DRAFT_STORAGE_KEY = "flightauth:draft:v1";

/** Per-template draft key so concurrent published forms don't overwrite each other. */
export function draftStorageKey(templateId: string) {
  return `${DRAFT_STORAGE_KEY}:${templateId}`;
}

/** Guest submissions allowed per IP per hour. */
export const GUEST_RATE_LIMIT = { max: 5, windowMinutes: 60 };
