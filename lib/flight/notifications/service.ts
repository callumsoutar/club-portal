import "server-only";

import { createServiceSupabase } from "@/lib/flight/supabase/server";
import type { NotificationEvent } from "@/lib/flight/types";
import {
  renderEmail,
  toHtml,
  type NotificationPayload,
} from "@/lib/flight/notifications/templates";

export interface NotifyInput {
  event: NotificationEvent;
  /**
   * Delivery address for pilot-facing events (approve / decline / submit receipt).
   * Club-facing events ignore this and use the central notification inbox.
   */
  to: string | null | undefined;
  recipientName?: string | null;
  payload?: NotificationPayload;
  authorisationId?: string | null;
  /**
   * Force delivery routing. Defaults from the event type:
   * club inbox for new requests / overdue, recipient otherwise.
   */
  deliverTo?: "club" | "recipient";
}

/**
 * Events that go to the club's central ops inbox.
 * Everything else is delivered to the `to` address (usually the pilot).
 */
const CLUB_INBOX_EVENTS = new Set<NotificationEvent>([
  "authorisation_submitted",
  "instructor_assigned",
  "overdue_return",
]);

/**
 * Every outbound message goes through here.
 *
 * Routing:
 *  - New authorisation / overdue alerts → `club_settings.notification_email`
 *  - Approve / decline → the pilot address on `to`
 *
 * Master switch: `club_settings.emails_enabled`. When off, rows are still
 * recorded as skipped so ops can see what would have been sent.
 *
 * Notifications are always persisted first and delivered second. That means:
 *  - nothing is lost if the mail provider is down,
 *  - the admin audit view shows what the system tried to send.
 *
 * Delivery itself is a swappable transport. Today it's Resend if the key is
 * present, and a no-op logger otherwise, so local development never sends real
 * email by accident.
 */
export async function notify(input: NotifyInput): Promise<{ queued: boolean }> {
  const supabase = createServiceSupabase();
  const settings = await getClubEmailSettings(supabase);
  const rendered = renderEmail(input.event, input.payload ?? {});
  const usesClubInbox =
    input.deliverTo === "club" ||
    (input.deliverTo !== "recipient" && CLUB_INBOX_EVENTS.has(input.event));

  const deliveryEmail = usesClubInbox
    ? settings.notificationEmail
    : normaliseEmail(input.to);

  if (!settings.emailsEnabled) {
    return insertSkipped(supabase, input, rendered, {
      recipientEmail: deliveryEmail ?? input.to ?? "unconfigured@inbox",
      reason: "Email notifications are disabled in club settings.",
    });
  }

  if (!deliveryEmail) {
    return insertSkipped(supabase, input, rendered, {
      recipientEmail: input.to || "unconfigured@inbox",
      reason: usesClubInbox
        ? "Club notification inbox is not configured in admin settings."
        : "No recipient email address was available.",
    });
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      event: input.event,
      recipient_email: deliveryEmail,
      recipient_name: input.recipientName ?? null,
      subject: rendered.subject,
      payload: {
        ...(input.payload ?? {}),
        intendedEmail: input.to ?? null,
        deliveryTarget: usesClubInbox ? "club" : "recipient",
      },
      authorisation_id: input.authorisationId ?? null,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[notifications] failed to queue", error);
    return { queued: false };
  }

  await dispatch(data.id);
  return { queued: true };
}

async function insertSkipped(
  supabase: ReturnType<typeof createServiceSupabase>,
  input: NotifyInput,
  rendered: ReturnType<typeof renderEmail>,
  opts: { recipientEmail: string; reason: string },
): Promise<{ queued: boolean }> {
  await supabase.from("notifications").insert({
    event: input.event,
    recipient_email: opts.recipientEmail,
    recipient_name: input.recipientName ?? null,
    subject: rendered.subject,
    payload: {
      ...(input.payload ?? {}),
      intendedEmail: input.to ?? null,
      deliverySkippedReason: opts.reason,
    },
    authorisation_id: input.authorisationId ?? null,
    scheduled_for: new Date().toISOString(),
    status: "skipped",
    sent_at: new Date().toISOString(),
    error: opts.reason,
  });
  console.warn(`[notifications] skipped — ${opts.reason}`);
  return { queued: false };
}

/** Send one queued notification. Safe to call repeatedly — it re-reads state. */
export async function dispatch(notificationId: string): Promise<void> {
  const supabase = createServiceSupabase();

  const { data: row } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single();

  if (!row || row.status === "sent" || row.status === "skipped") return;

  const settings = await getClubEmailSettings(supabase);
  if (!settings.emailsEnabled) {
    await supabase
      .from("notifications")
      .update({
        status: "skipped",
        error: "Email notifications are disabled in club settings.",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationId);
    return;
  }

  const event = row.event as NotificationEvent;
  const payload = (row.payload ?? {}) as NotificationPayload;
  const deliveryTarget =
    typeof payload.deliveryTarget === "string" ? payload.deliveryTarget : null;
  const usesClubInbox =
    deliveryTarget === "club" ||
    (deliveryTarget !== "recipient" && CLUB_INBOX_EVENTS.has(event));
  const to = usesClubInbox
    ? settings.notificationEmail
    : normaliseEmail(row.recipient_email);

  if (!to) {
    await supabase
      .from("notifications")
      .update({
        status: "skipped",
        error: usesClubInbox
          ? "Club notification inbox is not configured in admin settings."
          : "No recipient email address was available.",
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationId);
    return;
  }

  const rendered = renderEmail(event, row.payload ?? {});
  const transport = getTransport();

  await supabase
    .from("notifications")
    .update({
      status: "sending",
      attempts: (row.attempts ?? 0) + 1,
      recipient_email: to,
    })
    .eq("id", notificationId);

  try {
    const result = await transport.send({
      to,
      subject: rendered.subject,
      html: toHtml(rendered),
      idempotencyKey: `${event}/${notificationId}`,
    });

    await supabase
      .from("notifications")
      .update({
        status: result.skipped ? "skipped" : "sent",
        provider_id: result.id ?? null,
        sent_at: new Date().toISOString(),
        error: result.skipped
          ? "Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)."
          : null,
      })
      .eq("id", notificationId);
  } catch (err) {
    await supabase
      .from("notifications")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", notificationId);
  }
}

interface ClubEmailSettings {
  emailsEnabled: boolean;
  notificationEmail: string | null;
}

async function getClubEmailSettings(
  supabase: ReturnType<typeof createServiceSupabase>,
): Promise<ClubEmailSettings> {
  const { data, error } = await supabase
    .from("club_settings")
    .select("notification_email, emails_enabled")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    // Column may not exist yet on a partially-migrated database — fall back.
    console.error("[notifications] failed to load club settings", error);
    const { data: fallback } = await supabase
      .from("club_settings")
      .select("notification_email")
      .eq("id", true)
      .maybeSingle();
    return {
      emailsEnabled: false,
      notificationEmail: normaliseEmail(fallback?.notification_email),
    };
  }

  return {
    emailsEnabled: Boolean(data?.emails_enabled),
    notificationEmail: normaliseEmail(data?.notification_email),
  };
}

function normaliseEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email || null;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}

interface SendResult {
  id?: string;
  skipped?: boolean;
}

interface Transport {
  send(args: SendArgs): Promise<SendResult>;
}

let cached: Transport | null = null;

function getTransport(): Transport {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    cached = {
      async send({ to, subject }) {
        console.info(`[notifications] (no transport configured) → ${to}: ${subject}`);
        return { skipped: true };
      },
    };
    return cached;
  }

  cached = {
    async send({ to, subject, html, idempotencyKey }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      const { data, error } = await resend.emails.send(
        { from, to, subject, html },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      if (error) throw new Error(error.message);
      return { id: data?.id };
    },
  };

  return cached;
}
