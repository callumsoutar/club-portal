import type { NotificationEvent } from "@/lib/flight/types";
import { APP_NAME } from "@/lib/flight/constants";

/** All fields are nullable — callers pass straight through from the database. */
export interface NotificationPayload {
  pilotName?: string | null;
  reference?: string | null;
  aircraft?: string | null;
  instructorName?: string | null;
  destination?: string | null;
  exercise?: string | null;
  flightDate?: string | null;
  eta?: string | null;
  reason?: string | null;
  comment?: string | null;
  commenterName?: string | null;
  expiryDate?: string | null;
  documentType?: string | null;
  link?: string | null;
  /** When "pilot", authorisation_submitted uses the submitter receipt copy. */
  audience?: "pilot" | "club" | null;
  [key: string]: unknown;
}

type EmailTone = "info" | "success" | "danger" | "neutral" | "warning";

interface RenderedEmail {
  subject: string;
  preview: string;
  eyebrow: string;
  heading: string;
  body: string[];
  details?: { label: string; value: string }[];
  cta?: { label: string; url: string };
  tone: EmailTone;
}

const TONE: Record<
  EmailTone,
  { accent: string; badgeBg: string; badgeText: string; button: string }
> = {
  info: {
    accent: "#2547a8",
    badgeBg: "#e8eefc",
    badgeText: "#1e3a8a",
    button: "#2547a8",
  },
  success: {
    accent: "#0f7a4a",
    badgeBg: "#e6f6ee",
    badgeText: "#0b5c38",
    button: "#0f7a4a",
  },
  danger: {
    accent: "#b42318",
    badgeBg: "#fdeceb",
    badgeText: "#912018",
    button: "#b42318",
  },
  warning: {
    accent: "#b54708",
    badgeBg: "#fef0c7",
    badgeText: "#93370d",
    button: "#b54708",
  },
  neutral: {
    accent: "#3f4756",
    badgeBg: "#eef0f4",
    badgeText: "#3f4756",
    button: "#2547a8",
  },
};

/**
 * Copy for every notification the system can send.
 *
 * These are deliberately plain-text-shaped: `renderEmail` returns structure,
 * and the delivery layer decides how to dress it. Swapping Resend for anything
 * else does not touch this file.
 */
export function renderEmail(
  event: NotificationEvent,
  payload: NotificationPayload,
): RenderedEmail {
  const ref = payload.reference ?? "your authorisation";
  const link = payload.link ?? undefined;

  switch (event) {
    case "authorisation_submitted":
      // Pilot receipt (audience=pilot) vs club inbox review alert.
      if (payload.audience === "pilot") {
        return {
          subject: `${ref} · We've got your authorisation`,
          preview: `Your flight authorisation for ${payload.aircraft ?? "your aircraft"} is with your instructor.`,
          eyebrow: "Submitted",
          heading: "We've got your authorisation",
          body: [
            `Thanks${payload.pilotName ? `, ${payload.pilotName}` : ""}. Your authorisation is locked and waiting for an instructor to review it.`,
            "Most are actioned within a few minutes — use the link below to track the status.",
          ],
          details: compactDetails([
            { label: "Reference", value: payload.reference },
            { label: "Aircraft", value: payload.aircraft },
            { label: "Exercise", value: payload.exercise ?? payload.destination },
            { label: "Flight date", value: payload.flightDate },
            { label: "Expected back", value: payload.eta },
          ]),
          cta: link
            ? { label: "Track your authorisation", url: link }
            : undefined,
          tone: "info",
        };
      }

      return {
        subject: `${ref} · New authorisation request`,
        preview: `${payload.pilotName ?? "A pilot"} submitted a flight authorisation for ${payload.aircraft ?? "an aircraft"}.`,
        eyebrow: "New request",
        heading: "Authorisation ready for review",
        body: [
          `${payload.pilotName ?? "A pilot"} has submitted a flight authorisation and is waiting for a decision.`,
        ],
        details: compactDetails([
          { label: "Reference", value: payload.reference },
          { label: "Pilot", value: payload.pilotName },
          { label: "Aircraft", value: payload.aircraft },
          { label: "Exercise", value: payload.exercise ?? payload.destination },
          { label: "Flight date", value: payload.flightDate },
          { label: "Expected back", value: payload.eta },
        ]),
        cta: link
          ? { label: "Review authorisation", url: link }
          : undefined,
        tone: "info",
      };

    case "instructor_assigned":
      return {
        subject: `${ref} · You've been asked to authorise a flight`,
        preview: `${payload.pilotName ?? "A pilot"} nominated you to authorise a flight.`,
        eyebrow: "Action needed",
        heading: "A flight is waiting for you",
        body: [
          `${payload.pilotName ?? "A pilot"} has nominated you as the authorising instructor.`,
          "Most authorisations take under a minute to review.",
        ],
        details: compactDetails([
          { label: "Reference", value: payload.reference },
          { label: "Pilot", value: payload.pilotName },
          { label: "Aircraft", value: payload.aircraft },
          { label: "Exercise", value: payload.exercise ?? payload.destination },
        ]),
        cta: link
          ? { label: "Review authorisation", url: link }
          : undefined,
        tone: "info",
      };

    case "approval_granted":
      return {
        subject: `${ref} · Approved — you're cleared to fly`,
        preview: `Your authorisation for ${payload.aircraft ?? "your aircraft"} has been approved.`,
        eyebrow: "Approved",
        heading: "You're cleared to fly",
        body: [
          `${payload.instructorName ?? "Your instructor"} has approved your authorisation for ${payload.aircraft ?? "your aircraft"}.`,
          "Have a good flight. Remember to close out when you're back on the ground.",
        ],
        details: compactDetails([
          { label: "Reference", value: payload.reference },
          { label: "Aircraft", value: payload.aircraft },
          { label: "Approved by", value: payload.instructorName },
        ]),
        cta: link
          ? { label: "View your authorisation", url: link }
          : undefined,
        tone: "success",
      };

    case "approval_declined":
      return {
        subject: `${ref} · Not approved`,
        preview: "Your flight authorisation was not approved.",
        eyebrow: "Not approved",
        heading: "Your authorisation was not approved",
        body: [
          `${payload.instructorName ?? "An instructor"} was unable to approve this flight.`,
          payload.reason ? `Reason given: ${payload.reason}` : "",
          "Talk to your instructor if you'd like to resubmit.",
        ].filter(Boolean),
        details: compactDetails([
          { label: "Reference", value: payload.reference },
          { label: "Aircraft", value: payload.aircraft },
          { label: "Reviewed by", value: payload.instructorName },
          { label: "Reason", value: payload.reason },
        ]),
        cta: link ? { label: "View details", url: link } : undefined,
        tone: "danger",
      };

    case "comment_added":
      return {
        subject: `${ref} · New comment`,
        preview: `${payload.commenterName ?? "Someone"} left a comment on your authorisation.`,
        eyebrow: "Comment",
        heading: `${payload.commenterName ?? "Someone"} left a comment`,
        body: [payload.comment ?? ""],
        cta: link ? { label: "View authorisation", url: link } : undefined,
        tone: "neutral",
      };

    case "reminder_before_eta":
      return {
        subject: `${ref} · Due back soon`,
        preview: "Your ETA is coming up — check in if plans have changed.",
        eyebrow: "Reminder",
        heading: "You're due back shortly",
        body: [
          `Your ETA is ${payload.eta ?? "coming up"}. If your plans have changed, let the club know.`,
        ],
        cta: link ? { label: "View authorisation", url: link } : undefined,
        tone: "warning",
      };

    case "overdue_return":
      return {
        subject: `${ref} · OVERDUE — ${payload.pilotName ?? "pilot"} has not returned`,
        preview: `${payload.pilotName ?? "A pilot"} is past their ETA.`,
        eyebrow: "Overdue",
        heading: "Overdue aircraft",
        body: [
          `${payload.pilotName ?? "A pilot"} in ${payload.aircraft ?? "an aircraft"} is past their ETA of ${payload.eta ?? "unknown"}.`,
          "Attempt contact and escalate per club overdue procedure.",
        ],
        details: compactDetails([
          { label: "Reference", value: payload.reference },
          { label: "Pilot", value: payload.pilotName },
          { label: "Aircraft", value: payload.aircraft },
          { label: "ETA", value: payload.eta },
        ]),
        cta: link ? { label: "Open authorisation", url: link } : undefined,
        tone: "danger",
      };

    case "medical_expiring":
    case "bfr_expiring":
      return {
        subject: `Your ${payload.documentType ?? "currency document"} expires soon`,
        preview: `${payload.documentType ?? "A document"} expires on ${payload.expiryDate ?? "soon"}.`,
        eyebrow: "Currency",
        heading: `${payload.documentType ?? "A document"} is expiring`,
        body: [
          `Your ${payload.documentType ?? "document"} expires on ${payload.expiryDate ?? "soon"}.`,
          "Update it in your profile once renewed so your authorisations aren't held up.",
        ],
        cta: link ? { label: "Update profile", url: link } : undefined,
        tone: "warning",
      };

    case "welcome":
      return {
        subject: `Welcome to ${APP_NAME}`,
        preview: "Your details are saved — the next authorisation should take about thirty seconds.",
        eyebrow: "Welcome",
        heading: "You're all set",
        body: [
          `Welcome ${payload.pilotName ?? ""}. Your details are saved, so your next authorisation should take about thirty seconds.`,
        ],
        cta: link ? { label: "Open FlightAuth", url: link } : undefined,
        tone: "info",
      };

    case "account_created":
      return {
        subject: "Your account is ready",
        preview: "Sign in to view your authorisation history.",
        eyebrow: "Account",
        heading: "Account created",
        body: ["Your account has been created. Sign in to view your authorisation history."],
        cta: link ? { label: "Sign in", url: link } : undefined,
        tone: "info",
      };

    case "password_reset":
      return {
        subject: "Reset your password",
        preview: "Use the link below to choose a new password. It expires in one hour.",
        eyebrow: "Security",
        heading: "Password reset",
        body: ["Use the link below to choose a new password. It expires in one hour."],
        cta: link ? { label: "Choose a new password", url: link } : undefined,
        tone: "neutral",
      };

    default:
      return {
        subject: "Notification",
        preview: "You have a new notification.",
        eyebrow: "Notice",
        heading: "Notification",
        body: [],
        cta: link ? { label: "Open", url: link } : undefined,
        tone: "neutral",
      };
  }
}

/** Production-ready HTML shell with inlined styles for mail-client safety. */
export function toHtml(email: RenderedEmail): string {
  const palette = TONE[email.tone];

  const paragraphs = email.body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3f4756;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const details =
    email.details && email.details.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 24px;border-collapse:collapse;background:#f7f8fb;border:1px solid #e7e9f0;border-radius:12px;">
          <tr><td style="padding:4px 0;">
            ${email.details
              .map(
                (row, i) => `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#8a93a5;width:38%;${i > 0 ? "border-top:1px solid #e7e9f0;" : ""}">${escapeHtml(row.label)}</td>
                  <td style="padding:12px 16px;font-size:14px;font-weight:560;color:#151a24;text-align:right;${i > 0 ? "border-top:1px solid #e7e9f0;" : ""}">${escapeHtml(row.value)}</td>
                </tr>
              </table>`,
              )
              .join("")}
          </td></tr>
        </table>`
      : "";

  const button = email.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-collapse:collapse;">
        <tr>
          <td style="border-radius:10px;background:${palette.button};">
            <a href="${escapeHtml(email.cta.url)}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;box-sizing:border-box;">${escapeHtml(email.cta.label)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#8a93a5;word-break:break-all;">
        Or open <a href="${escapeHtml(email.cta.url)}" style="color:${palette.accent};text-decoration:underline;">${escapeHtml(email.cta.url)}</a>
      </p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(email.preview)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#eef1f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 4px 18px;">
              <span style="font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#151a24;">${escapeHtml(APP_NAME)}</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e1e5ef;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(21,26,36,0.06);">
              <div style="height:4px;background:${palette.accent};line-height:4px;font-size:0;">&nbsp;</div>
              <div style="padding:28px 28px 30px;">
                <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:${palette.badgeBg};color:${palette.badgeText};font-size:11px;font-weight:650;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(email.eyebrow)}</span>
                <h1 style="margin:14px 0 16px;font-size:24px;line-height:1.25;color:#151a24;letter-spacing:-0.03em;font-weight:700;">${escapeHtml(email.heading)}</h1>
                ${paragraphs}
                ${details}
                ${button}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a93a5;">
                Sent by ${escapeHtml(APP_NAME)} · Flight authorisations for your club
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function compactDetails(
  rows: { label: string; value?: string | null }[],
): { label: string; value: string }[] {
  return rows
    .filter((row): row is { label: string; value: string } =>
      Boolean(row.value && String(row.value).trim()),
    )
    .map((row) => ({ label: row.label, value: String(row.value).trim() }));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
