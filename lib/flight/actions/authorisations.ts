"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { audit, checkRateLimit, getClientIp, logActivity } from "@/lib/flight/audit";
import { GUEST_RATE_LIMIT } from "@/lib/flight/constants";
import { buildTemplateSchema, indexFields } from "@/lib/flight/form-engine";
import { notify } from "@/lib/flight/notifications/service";
import { getAuthorisation, getPublishedTemplateById } from "@/lib/flight/queries";
import { getSessionUser } from "@/lib/flight/auth";
import { uploadSignature } from "@/lib/flight/storage";
import { createServiceSupabase } from "@/lib/flight/supabase/server";
import { combineDateTime, formatDate, formatDateTime } from "@/lib/flight/format";
import type { AnswerMap, LicenceType } from "@/lib/flight/types";

export interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

/**
 * Submit an authorisation.
 *
 * This is the one unauthenticated write path in the app, so it does the most
 * work: rate limit, re-validate every answer against the live template on the
 * server, upload the signature out of band, then write a locked record.
 *
 * The client's validation is a UX affordance. This is the real gate.
 *
 * Post-insert bookkeeping (answer rows, audit, club-inbox notification) runs
 * in `after()` so the pilot isn't held waiting on Resend / secondary writes.
 */
export async function submitAuthorisation(
  answers: AnswerMap,
  templateId: string,
): Promise<ActionResult<{ id: string; reference: string; token: string }>> {
  const [template, user, h] = await Promise.all([
    getPublishedTemplateById(templateId),
    getSessionUser(),
    headers(),
  ]);

  if (!template) {
    return {
      ok: false,
      error: "That authorisation form is no longer published.",
    };
  }

  // Guests are rate limited by IP; signed-in members are already accountable.
  if (!user) {
    const ip = getClientIp(h) ?? "unknown";
    const { allowed } = await checkRateLimit(
      "guest_submission",
      ip,
      GUEST_RATE_LIMIT.max,
      GUEST_RATE_LIMIT.windowMinutes,
    );
    if (!allowed) {
      return {
        ok: false,
        error: "Too many submissions from this device. Please try again later.",
      };
    }
  }

  const schema = buildTemplateSchema(template, answers);
  const parsed = schema.safeParse(answers);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Some answers need attention.", fieldErrors };
  }

  const values = parsed.data as AnswerMap;
  const supabase = createServiceSupabase();

  // Resolve the promoted columns from whichever keys the template uses.
  const aircraftId = asString(values.aircraft_id);
  const instructorId = asString(values.instructor_id);

  const [aircraftResult, instructorResult] = await Promise.all([
    aircraftId
      ? supabase
          .from("aircraft")
          .select("registration, is_active")
          .eq("id", aircraftId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    instructorId
      ? supabase
          .from("instructors")
          .select("id, full_name, email, is_active")
          .eq("id", instructorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const aircraft = aircraftResult.data;
  const instructor = instructorResult.data;

  if (aircraftId && !aircraft?.is_active) {
    return {
      ok: false,
      error: "That aircraft is no longer available. Please choose another.",
      fieldErrors: { aircraft_id: "Not currently available" },
    };
  }

  if (instructorId && !instructor?.is_active) {
    return {
      ok: false,
      error: "That instructor is no longer available. Please choose another.",
      fieldErrors: { instructor_id: "Not currently available" },
    };
  }

  const reference = `TMP-${Date.now()}`;
  let signaturePath: string | null = null;
  try {
    signaturePath = await uploadSignature(asString(values.signature) ?? "", reference);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Signature upload failed." };
  }

  const flightDate = asString(values.flight_date);
  // Prefer SAR time when present (cross-country forms); fall back to return ETA.
  const etaTime = asString(values.sar_time) ?? asString(values.return_eta) ?? "";
  const returnEta = flightDate ? combineDateTime(flightDate, etaTime) : null;

  // The signature lives in storage, not in the answer blob.
  const storedAnswers: AnswerMap = { ...values, signature: signaturePath };

  const { data: created, error } = await supabase
    .from("authorisations")
    .insert({
      status: "submitted",
      profile_id: user?.id ?? null,
      is_guest: !user,

      pilot_name: asString(values.pilot_name) ?? user?.profile.full_name ?? "Unknown pilot",
      pilot_email:
        normaliseEmail(user?.email) ??
        normaliseEmail(asString(values.pilot_email)) ??
        null,
      pilot_phone: asString(values.pilot_phone) ?? null,
      pilot_licence_type: (asString(values.licence_type) as LicenceType) ?? null,
      pilot_bfr_expiry: asString(values.bfr_expiry) ?? null,
      pilot_medical_expiry: asString(values.medical_expiry) ?? null,

      aircraft_id: aircraftId,
      aircraft_registration: aircraft?.registration ?? null,
      instructor_id: instructorId,
      flight_date: flightDate,
      exercise: asString(values.exercise) ?? null,
      destination: asString(values.destination) ?? asString(values.exercise) ?? null,
      passenger_names: asString(values.passenger_names) ?? null,
      return_eta: returnEta,

      answers: storedAnswers,
      template_id: template.id,
      template_snapshot: template,

      signature_url: signaturePath,
      signed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id, reference, access_token")
    .single();

  if (error || !created) {
    console.error("[submit] insert failed", error);
    return { ok: false, error: "We couldn't save your authorisation. Please try again." };
  }

  const pilotName = asString(values.pilot_name);
  const registration = aircraft?.registration ?? undefined;
  const pilotEmail =
    normaliseEmail(user?.email) ??
    normaliseEmail(asString(values.pilot_email)) ??
    null;
  const trackingLink = absoluteUrl(`/a/${created.access_token}`);
  const reviewLink = absoluteUrl(`/fly/instructor/authorisations/${created.id}`);
  const sharedPayload = {
    pilotName,
    reference: created.reference,
    aircraft: registration,
    exercise: asString(values.exercise),
    destination: asString(values.destination) ?? asString(values.exercise),
    flightDate: formatDate(flightDate, "EEE d MMM yyyy"),
    eta: returnEta ? formatDateTime(returnEta) : undefined,
  };

  // Non-critical follow-up: don't block the pilot on email / denormalised rows.
  after(async () => {
    await writeAnswerRows(created.id, template, values);

    await Promise.all([
      logActivity({
        authorisationId: created.id,
        actorId: user?.id,
        actorLabel: pilotName ?? "Pilot",
        verb: "submitted",
        summary: `Authorisation submitted for ${registration ?? "an aircraft"}`,
      }),
      audit({
        actorId: user?.id,
        actorLabel: user?.email ?? "guest",
        action: "authorisation.submit",
        entityType: "authorisation",
        entityId: created.id,
        after: { reference: created.reference, status: "submitted" },
      }),
      // Club ops inbox — new request ready for review.
      notify({
        event: "authorisation_submitted",
        deliverTo: "club",
        to: instructor?.email,
        recipientName: instructor?.full_name,
        authorisationId: created.id,
        payload: {
          ...sharedPayload,
          link: reviewLink,
        },
      }),
      // Submitter receipt — tracking link for the pilot.
      notify({
        event: "authorisation_submitted",
        deliverTo: "recipient",
        to: pilotEmail,
        recipientName: pilotName,
        authorisationId: created.id,
        payload: {
          ...sharedPayload,
          audience: "pilot",
          link: trackingLink,
        },
      }),
    ]);

    if (user) await rememberPilotDetails(user.id, values);

    revalidatePath("/fly/instructor");
    revalidatePath("/fly");
  });

  return {
    ok: true,
    data: {
      id: created.id,
      reference: created.reference,
      token: created.access_token,
    },
  };
}

async function writeAnswerRows(
  authorisationId: string,
  template: NonNullable<Awaited<ReturnType<typeof getPublishedTemplateById>>>,
  values: AnswerMap,
) {
  if (!template) return;
  const index = indexFields(template);
  const supabase = createServiceSupabase();

  const rows = Object.entries(values)
    .filter(([key]) => index.has(key) && key !== "signature")
    .map(([key, value]) => {
      const entry = index.get(key)!;
      return {
        authorisation_id: authorisationId,
        field_key: key,
        section_key: entry.section.key,
        label: entry.field.label,
        field_type: entry.field.type,
        value_text: typeof value === "string" ? value : null,
        value_number: typeof value === "number" ? value : null,
        value_boolean: typeof value === "boolean" ? value : null,
        value_date:
          entry.field.type === "date" && typeof value === "string" && value ? value : null,
        value_json: value === null || value === undefined ? null : { v: value },
      };
    });

  if (!rows.length) return;

  const { error } = await supabase.from("authorisation_answers").insert(rows);
  if (error) console.error("[submit] answer rows failed (non-fatal)", error);
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

const decisionSchema = z.object({
  authorisationId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export async function approveAuthorisation(
  input: z.infer<typeof decisionSchema>,
): Promise<ActionResult> {
  return decide("approved", input);
}

export async function declineAuthorisation(
  input: z.infer<typeof decisionSchema>,
): Promise<ActionResult> {
  // A decline without an explanation is useless to the pilot, so it's required
  // here rather than being left to the UI to enforce.
  if (!input.reason || input.reason.trim().length < 3) {
    return {
      ok: false,
      error: "Please explain why this flight can't be approved.",
      fieldErrors: { reason: "A reason is required when declining." },
    };
  }
  return decide("declined", input);
}

async function decide(
  decision: "approved" | "declined",
  raw: z.infer<typeof decisionSchema>,
): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const user = await getSessionUser();
  if (!user || (user.profile.role !== "instructor" && user.profile.role !== "admin")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const { authorisationId, reason } = parsed.data;
  const existing = await getAuthorisation(authorisationId);
  if (!existing) return { ok: false, error: "Authorisation not found." };

  // Guard against two instructors deciding the same flight from two phones.
  if (!["submitted", "pending"].includes(existing.status)) {
    return {
      ok: false,
      error: `This authorisation has already been ${existing.status}.`,
    };
  }

  const supabase = createServiceSupabase();

  const { error } = await supabase
    .from("authorisations")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", authorisationId)
    .in("status", ["submitted", "pending"]);

  if (error) {
    console.error("[decide] update failed", error);
    return { ok: false, error: "We couldn't record that decision." };
  }

  await supabase.from("approvals").insert({
    authorisation_id: authorisationId,
    instructor_id: existing.instructor_id,
    actor_id: user.id,
    decision,
    reason: reason ?? null,
  });

  const actorName = user.profile.full_name ?? user.email;
  const pilotEmail = await resolvePilotEmail(existing);

  await Promise.all([
    logActivity({
      authorisationId,
      actorId: user.id,
      actorLabel: actorName,
      verb: decision,
      summary:
        decision === "approved"
          ? `Approved by ${actorName}`
          : `Declined by ${actorName}${reason ? ` — ${reason}` : ""}`,
    }),
    audit({
      actorId: user.id,
      actorLabel: actorName,
      action: `authorisation.${decision}`,
      entityType: "authorisation",
      entityId: authorisationId,
      before: { status: existing.status },
      after: { status: decision, reason },
    }),
    notify({
      event: decision === "approved" ? "approval_granted" : "approval_declined",
      deliverTo: "recipient",
      to: pilotEmail,
      recipientName: existing.pilot_name,
      authorisationId,
      payload: {
        reference: existing.reference,
        instructorName: actorName,
        aircraft: existing.aircraft_registration ?? undefined,
        reason,
        link: absoluteUrl(`/a/${existing.access_token}`),
      },
    }),
  ]);

  // Backfill pilot_email when we resolved it from the profile — keeps future
  // notifications (and the audit trail) consistent.
  if (pilotEmail && !existing.pilot_email) {
    await supabase
      .from("authorisations")
      .update({ pilot_email: pilotEmail })
      .eq("id", authorisationId);
  }

  // On approval, no deferred ETA / overdue emails — this project does not run
  // a cron worker. Immediate notify() calls above cover approve / decline.

  revalidatePath("/fly/instructor");
  revalidatePath(`/fly/instructor/authorisations/${authorisationId}`);
  revalidatePath("/fly");
  if (existing.access_token) {
    revalidatePath(`/a/${existing.access_token}`);
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Comments & lifecycle
// ---------------------------------------------------------------------------

const commentSchema = z.object({
  authorisationId: z.string().uuid(),
  body: z.string().trim().min(1, "Say something first.").max(2000),
  isInternal: z.boolean().default(false),
});

export async function addComment(
  raw: z.infer<typeof commentSchema>,
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to comment." };

  const { authorisationId, body, isInternal } = parsed.data;
  const existing = await getAuthorisation(authorisationId);
  if (!existing) return { ok: false, error: "Authorisation not found." };

  const isStaff = user.profile.role !== "member";
  if (!isStaff && existing.profile_id !== user.id) {
    return { ok: false, error: "You don't have permission to comment here." };
  }

  const authorName = user.profile.full_name ?? user.email;
  const supabase = createServiceSupabase();

  await supabase.from("comments").insert({
    authorisation_id: authorisationId,
    author_id: user.id,
    author_name: authorName,
    body,
    // Only staff can write internal notes; a member's flag is ignored.
    is_internal: isStaff ? isInternal : false,
  });

  await logActivity({
    authorisationId,
    actorId: user.id,
    actorLabel: authorName,
    verb: "commented",
    summary: `${authorName} left a comment`,
  });

  if (!isInternal) {
    await notify({
      event: "comment_added",
      deliverTo: "recipient",
      to: isStaff ? await resolvePilotEmail(existing) : null,
      authorisationId,
      payload: {
        reference: existing.reference,
        commenterName: authorName,
        comment: body,
        link: absoluteUrl(`/a/${existing.access_token}`),
      },
    });
  }

  revalidatePath(`/fly/instructor/authorisations/${authorisationId}`);
  return { ok: true };
}

export async function markCompleted(authorisationId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.profile.role === "member") {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("authorisations")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", authorisationId)
    .eq("status", "approved");

  if (error) return { ok: false, error: "Couldn't close out this flight." };

  await logActivity({
    authorisationId,
    actorId: user.id,
    actorLabel: user.profile.full_name ?? user.email,
    verb: "completed",
    summary: "Flight closed out — aircraft back on the ground",
  });

  revalidatePath("/fly/instructor");
  return { ok: true };
}

/** Statuses that can still be archived (flight won't happen). */
const ARCHIVABLE_STATUSES = ["submitted", "pending", "approved"] as const;

/**
 * Archive an authorisation that isn't going flying.
 * Stored as status `cancelled` (shown as "Archived" in the UI).
 * Admins only — students and instructors cannot archive.
 */
export async function archiveAuthorisation(
  authorisationId: string,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  if (user.profile.role !== "admin") {
    return { ok: false, error: "Only an admin can archive authorisations." };
  }

  const existing = await getAuthorisation(authorisationId);
  if (!existing) return { ok: false, error: "Authorisation not found." };

  return archiveRecord(existing, {
    actorId: user.id,
    actorLabel: user.profile.full_name ?? user.email,
  });
}

/** @deprecated Token archive is disabled — admins must archive while signed in. */
export async function archiveAuthorisationByToken(
  _token: string,
): Promise<ActionResult> {
  return {
    ok: false,
    error: "Only an admin can archive authorisations.",
  };
}

/** @deprecated Prefer {@link archiveAuthorisation}. */
export async function cancelAuthorisation(
  authorisationId: string,
): Promise<ActionResult> {
  return archiveAuthorisation(authorisationId);
}

async function archiveRecord(
  existing: {
    id: string;
    status: string;
    access_token?: string | null;
  },
  actor: { actorId?: string; actorLabel: string },
): Promise<ActionResult> {
  if (
    !ARCHIVABLE_STATUSES.includes(
      existing.status as (typeof ARCHIVABLE_STATUSES)[number],
    )
  ) {
    return {
      ok: false,
      error: "This authorisation can no longer be archived.",
    };
  }

  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from("authorisations")
    .update({ status: "cancelled" })
    .eq("id", existing.id)
    .in("status", [...ARCHIVABLE_STATUSES]);

  if (error) {
    console.error("[archive] update failed", error);
    return { ok: false, error: "Couldn't archive this authorisation." };
  }

  await logActivity({
    authorisationId: existing.id,
    actorId: actor.actorId,
    actorLabel: actor.actorLabel,
    verb: "cancelled",
    summary: "Authorisation archived — not flying",
  });

  revalidatePath("/fly");
  revalidatePath("/fly/instructor");
  revalidatePath(`/fly/instructor/authorisations/${existing.id}`);
  if (existing.access_token) {
    revalidatePath(`/a/${existing.access_token}`);
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

const LICENCE_TYPES = new Set<LicenceType>([
  "student",
  "rpl",
  "ppl",
  "cpl",
  "atpl",
  "instructor",
]);

/** Keep the signed-in pilot's profile in step with the form they just sent. */
async function rememberPilotDetails(userId: string, values: AnswerMap) {
  const supabase = createServiceSupabase();
  const fullName = asString(values.pilot_name);
  const phone = asString(values.pilot_phone);
  const licence = asString(values.licence_type);
  const bfr = asString(values.bfr_expiry);
  const medical = asString(values.medical_expiry);
  const aircraftId = asString(values.aircraft_id);
  const date = /^\d{4}-\d{2}-\d{2}$/;

  if (fullName || phone) {
    await supabase
      .from("profiles")
      .update({
        ...(fullName ? { full_name: fullName } : {}),
        ...(phone ? { phone } : {}),
      })
      .eq("id", userId);
  }

  await supabase.from("pilot_profiles").upsert(
    {
      profile_id: userId,
      ...(licence && LICENCE_TYPES.has(licence as LicenceType)
        ? { licence_type: licence as LicenceType }
        : {}),
      ...(bfr && date.test(bfr) ? { bfr_expiry: bfr } : {}),
      ...(medical && date.test(medical) ? { medical_expiry: medical } : {}),
      ...(aircraftId ? { preferred_aircraft_id: aircraftId } : {}),
    },
    { onConflict: "profile_id" },
  );
}

function normaliseEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase();
  return email || null;
}

/** Prefer the address stored on the auth, then the linked profile email. */
async function resolvePilotEmail(existing: {
  pilot_email: string | null;
  profile_id: string | null;
}): Promise<string | null> {
  const direct = normaliseEmail(existing.pilot_email);
  if (direct) return direct;
  if (!existing.profile_id) return null;

  const supabase = createServiceSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", existing.profile_id)
    .maybeSingle();

  return normaliseEmail(data?.email);
}

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}
