"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { getClientIp } from "@/lib/flight/audit";
import { getSessionUser } from "@/lib/flight/auth";
import {
  buildTemplateSchema,
  indexFields,
  isPresentational,
} from "@/lib/flight/form-engine";
import { combineDateTime } from "@/lib/flight/format";
import { getAuthorisation } from "@/lib/flight/queries";
import { createServerSupabase } from "@/lib/flight/supabase/server";
import { getCompanySettings } from "@/lib/get-company-settings";
import type { ActionResult } from "@/lib/flight/actions/authorisations";
import type {
  AnswerMap,
  FormField,
  FormTemplate,
  LicenceType,
} from "@/lib/flight/types";

const requestSchema = z.object({
  authorisationId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(8, "Give a reason of at least 8 characters.").max(1000),
});

const LICENCE_TYPES = new Set<LicenceType>([
  "student",
  "rpl",
  "ppl",
  "cpl",
  "atpl",
  "instructor",
]);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Correct any answer on a submitted authorisation.
 *
 * The database function is the real gate: it checks the caller is an admin,
 * refuses the write unless it can audit it, and leaves the pilot's signature
 * untouched. This action validates the new answers against the frozen template
 * before that function runs.
 */
export async function correctSubmittedResponses(raw: {
  authorisationId: string;
  answers: AnswerMap;
  reason: string;
}): Promise<ActionResult<{ changed: number }>> {
  const parsedRequest = requestSchema.safeParse(raw);
  if (!parsedRequest.success) {
    const reasonError = parsedRequest.error.issues.find((issue) =>
      issue.path.includes("reason"),
    );
    return {
      ok: false,
      error: reasonError?.message ?? "That correction isn't valid.",
      fieldErrors: reasonError ? { reason: reasonError.message } : undefined,
    };
  }

  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") {
    return { ok: false, error: "Only an admin can correct a submitted response." };
  }

  const { authorisationId, answers, reason } = parsedRequest.data;
  const existing = await getAuthorisation(authorisationId);
  if (!existing) return { ok: false, error: "Authorisation not found." };

  if (!existing.locked_at || existing.status === "draft") {
    return { ok: false, error: "Only a submitted authorisation can be corrected." };
  }

  const template = existing.template_snapshot;
  if (!template) {
    return {
      ok: false,
      error: "This authorisation has no form snapshot, so its responses can't be corrected safely.",
    };
  }

  const editable = withoutSignature(template);
  const schema = buildTemplateSchema(editable, answers);
  const parsedAnswers = schema.safeParse(answers);
  if (!parsedAnswers.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedAnswers.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Some responses need attention.", fieldErrors };
  }

  const nextAnswers: AnswerMap = {
    ...existing.answers,
    ...(parsedAnswers.data as AnswerMap),
  };
  if ("signature" in existing.answers) {
    nextAnswers.signature = existing.answers.signature;
  } else {
    delete nextAnswers.signature;
  }

  const aircraftId = asUuid(nextAnswers.aircraft_id);
  const instructorId = asUuid(nextAnswers.instructor_id);
  if (asString(nextAnswers.aircraft_id) && !aircraftId) {
    return {
      ok: false,
      error: "That aircraft is not on the fleet.",
      fieldErrors: { aircraft_id: "Not on the fleet" },
    };
  }
  if (asString(nextAnswers.instructor_id) && !instructorId) {
    return {
      ok: false,
      error: "That instructor is not on the roster.",
      fieldErrors: { instructor_id: "Not on the roster" },
    };
  }

  const licence = asString(nextAnswers.licence_type);
  if (licence && !LICENCE_TYPES.has(licence as LicenceType)) {
    return {
      ok: false,
      error: "That licence type is not valid.",
      fieldErrors: { licence_type: "Choose a licence type" },
    };
  }

  const supabase = await createServerSupabase();
  const [aircraftResult, instructorResult, company, h] = await Promise.all([
    aircraftId
      ? supabase
          .from("aircraft")
          .select("registration")
          .eq("id", aircraftId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    instructorId
      ? supabase.from("instructors").select("id").eq("id", instructorId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getCompanySettings(),
    headers(),
  ]);

  if (aircraftId && !aircraftResult.data) {
    return {
      ok: false,
      error: "That aircraft is not on the fleet.",
      fieldErrors: { aircraft_id: "Not on the fleet" },
    };
  }
  if (instructorId && !instructorResult.data) {
    return {
      ok: false,
      error: "That instructor is not on the roster.",
      fieldErrors: { instructor_id: "Not on the roster" },
    };
  }

  const fieldKeys = new Set(indexFields(template).keys());
  const flightDate = asDate(nextAnswers.flight_date);
  const etaTime = asString(nextAnswers.sar_time) ?? asString(nextAnswers.return_eta) ?? "";
  const returnEta = flightDate
    ? combineDateTime(flightDate, etaTime, company.timeZone)
    : null;

  // Only columns backed by a field on this form are rewritten. Identity
  // captured outside the form (for example the account email) stays put.
  const columns: Record<string, string | null> = {};
  if (fieldKeys.has("pilot_name")) columns.pilot_name = asString(nextAnswers.pilot_name);
  if (fieldKeys.has("pilot_email")) {
    columns.pilot_email = asString(nextAnswers.pilot_email)?.toLowerCase() ?? null;
  }
  if (fieldKeys.has("pilot_phone")) columns.pilot_phone = asString(nextAnswers.pilot_phone);
  if (fieldKeys.has("licence_type")) {
    columns.pilot_licence_type =
      licence && LICENCE_TYPES.has(licence as LicenceType) ? licence : null;
  }
  if (fieldKeys.has("bfr_expiry")) columns.pilot_bfr_expiry = asDate(nextAnswers.bfr_expiry);
  if (fieldKeys.has("medical_expiry")) {
    columns.pilot_medical_expiry = asDate(nextAnswers.medical_expiry);
  }
  if (fieldKeys.has("aircraft_id")) {
    columns.aircraft_id = aircraftId;
    columns.aircraft_registration = aircraftResult.data?.registration ?? null;
  }
  if (fieldKeys.has("instructor_id")) columns.instructor_id = instructorId;
  if (fieldKeys.has("flight_date")) columns.flight_date = flightDate;
  if (fieldKeys.has("exercise")) columns.exercise = asString(nextAnswers.exercise);
  if (fieldKeys.has("destination") || fieldKeys.has("exercise")) {
    columns.destination =
      asString(nextAnswers.destination) ?? asString(nextAnswers.exercise);
  }
  if (fieldKeys.has("passenger_names")) {
    columns.passenger_names = asString(nextAnswers.passenger_names);
  }
  if (
    fieldKeys.has("flight_date") &&
    (fieldKeys.has("sar_time") || fieldKeys.has("return_eta"))
  ) {
    columns.return_eta = returnEta;
  }

  const { data, error } = await supabase.rpc("correct_submitted_responses", {
    p_authorisation_id: authorisationId,
    p_answers: nextAnswers,
    p_reason: reason,
    p_columns: columns,
    p_answer_rows: answerRows(authorisationId, template, nextAnswers),
    p_ip: getClientIp(h),
    p_user_agent: h.get("user-agent"),
  });

  if (error) {
    console.error("[correct] failed", error);
    return { ok: false, error: correctionError(error.message) };
  }

  revalidatePath("/fly/instructor");
  revalidatePath(`/fly/instructor/authorisations/${authorisationId}`);
  revalidatePath("/fly");
  if (existing.access_token) revalidatePath(`/a/${existing.access_token}`);

  const changed =
    data && typeof data === "object" && "changed" in data
      ? Number((data as { changed: unknown }).changed)
      : 0;

  return { ok: true, data: { changed: Number.isFinite(changed) ? changed : 0 } };
}

function withoutSignature(template: FormTemplate): FormTemplate {
  return {
    ...template,
    sections: template.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => field.type !== "signature"),
    })),
  };
}

function answerRows(
  authorisationId: string,
  template: FormTemplate,
  values: AnswerMap,
) {
  const index = indexFields(template);
  return Object.entries(values)
    .filter(([key]) => {
      const entry = index.get(key);
      return Boolean(entry) && key !== "signature" && !isPresentational(entry!.field);
    })
    .map(([key, value]) => {
      const field: FormField = index.get(key)!.field;
      const section = index.get(key)!.section;
      return {
        authorisation_id: authorisationId,
        field_key: key,
        section_key: section.key,
        label: field.label,
        field_type: field.type,
        value_text: typeof value === "string" ? value : null,
        value_number: typeof value === "number" ? value : null,
        value_boolean: typeof value === "boolean" ? value : null,
        value_date:
          field.type === "date" && typeof value === "string" && DATE_ONLY.test(value)
            ? value
            : null,
        value_json: value === null || value === undefined ? null : { v: value },
      };
    });
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asDate(value: unknown): string | null {
  const text = asString(value);
  return text && DATE_ONLY.test(text) ? text : null;
}

function asUuid(value: unknown): string | null {
  const text = asString(value);
  return text && UUID.test(text) ? text : null;
}

function correctionError(message: string): string {
  const known = [
    "Only an admin can correct a submitted response",
    "Give a reason of at least 8 characters so the audit log is useful",
    "Reason is too long",
    "Only a submitted authorisation can be corrected",
    "No responses were changed",
    "Authorisation not found",
    "That licence type is not valid",
    "That aircraft is not on the fleet",
    "That instructor is not on the roster",
    "Flight date must be a calendar date",
    "BFR expiry must be a calendar date",
    "Medical expiry must be a calendar date",
    "A corrected value is not in a valid format",
    "A corrected aircraft or instructor is not on file",
    "Signature is immutable after submission",
  ];
  const match = known.find((item) => message.includes(item));
  return match ?? "We couldn't save that correction. Please try again.";
}
