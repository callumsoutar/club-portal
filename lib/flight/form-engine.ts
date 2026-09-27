import { z } from "zod";

import type {
  AnswerMap,
  Aircraft,
  FieldCondition,
  FieldOption,
  FormField,
  FormSection,
  FormTemplate,
  Instructor,
} from "@/lib/flight/types";

/** Field types that render as content only and never produce an answer. */
const PRESENTATIONAL: FormField["type"][] = ["heading", "info", "paragraph"];

export function isPresentational(field: FormField) {
  return PRESENTATIONAL.includes(field.type);
}

/**
 * Live option sources. The aircraft and instructor dropdowns are resolved here
 * rather than stored on the field, so adding an aircraft in the admin panel
 * immediately changes the pilot's form with no republish step.
 */
export interface DataSources {
  aircraft: Aircraft[];
  instructors: Instructor[];
}

export function resolveOptions(field: FormField, sources: DataSources): FieldOption[] {
  switch (field.data_source) {
    case "aircraft":
      return sources.aircraft.map((a) => ({
        value: a.id,
        label: a.display_name || `${a.aircraft_type} · ${a.registration}`,
        // Don't repeat the registration — it's already in the label. Only
        // surface status when the aircraft isn't flyable.
        description: a.status !== "available" ? titleCase(a.status) : undefined,
        disabled: a.status !== "available",
      }));
    case "instructors":
      return sources.instructors.map((i) => ({
        value: i.id,
        label: i.full_name,
      }));
    default:
      return field.options ?? [];
  }
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Evaluate a field condition against the current answers. */
export function matchesCondition(
  rule: FieldCondition,
  answers: AnswerMap,
): boolean {
  const other = answers[rule.field];
  switch (rule.op) {
    case "eq":
      return other === rule.value;
    case "neq":
      return other !== rule.value;
    case "truthy":
      return Boolean(other);
    default:
      return true;
  }
}

/**
 * Conditional visibility. Adding a rule in the builder needs no changes to
 * the renderer or validator — only the stored `visible_when` JSON.
 */
export function isFieldVisible(field: FormField, answers: AnswerMap): boolean {
  const rule = field.visible_when;
  if (!rule) return true;
  return matchesCondition(rule, answers);
}

/**
 * Whether a visible field must be answered right now.
 *
 * A field marked `is_required` can still be optional when `required_when`
 * does not match (e.g. BFR expiry for student pilots). Student pilots also
 * get a built-in exemption on `bfr_expiry` so the rule holds even before the
 * form builder / DB row is updated.
 */
export function isFieldRequired(field: FormField, answers: AnswerMap): boolean {
  if (!field.is_required) return false;

  // Domain rule: student pilots do not hold a BFR.
  if (field.key === "bfr_expiry" && answers.licence_type === "student") {
    return false;
  }

  if (field.required_when) {
    return matchesCondition(field.required_when, answers);
  }

  return true;
}

export function visibleFields(section: FormSection, answers: AnswerMap): FormField[] {
  return section.fields
    .filter((f) => isFieldVisible(f, answers))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Build a Zod schema for a single field.
 *
 * Every field is validated identically on the client (for instant feedback)
 * and on the server (because the client cannot be trusted) — same function,
 * one definition of correct.
 */
function fieldSchema(field: FormField, required: boolean): z.ZodTypeAny {
  const v = field.validation ?? {};

  switch (field.type) {
    case "checkbox":
    case "toggle": {
      if (v.mustBeTrue) {
        return z.boolean().refine((val) => val === true, {
          message: `Please confirm: ${field.label}`,
        });
      }
      // Toggle defaults to unanswered (null) so Yes/No aren't pre-selected.
      if (field.type === "toggle") {
        return required
          ? z.boolean({ message: `Please choose Yes or No for ${field.label}` })
          : z.boolean().nullable().optional();
      }
      return required
        ? z.boolean({ message: `${field.label} is required` })
        : z.boolean().optional().default(false);
    }

    case "number": {
      let schema = z.coerce.number({ message: `${field.label} must be a number` });
      if (v.min !== undefined) schema = schema.min(v.min, `Must be at least ${v.min}`);
      if (v.max !== undefined) schema = schema.max(v.max, `Must be at most ${v.max}`);
      return required ? schema : schema.optional();
    }

    case "date": {
      const schema = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, `${field.label} must be a valid date`);
      return required
        ? schema.min(1, `${field.label} is required`)
        : schema.optional().or(z.literal(""));
    }

    case "time": {
      const schema = z
        .string()
        .regex(
          /^([01]\d|2[0-3]):[0-5]\d$/,
          `${field.label} — try 1415, 2:15pm, or 14:15`,
        );
      return required
        ? schema.min(1, `${field.label} is required`)
        : schema.optional().or(z.literal(""));
    }

    case "signature": {
      // Stored as a data URL until upload; we only assert it looks like one.
      const schema = z
        .string()
        .refine((val) => val.startsWith("data:image/") || val.startsWith("http"), {
          message: "Please sign before continuing",
        });
      return required ? schema : schema.optional().or(z.literal(""));
    }

    case "select":
    case "radio": {
      const schema = z.string();
      return required
        ? schema.min(1, `Please choose ${field.label.toLowerCase()}`)
        : schema.optional().or(z.literal(""));
    }

    default: {
      // text / textarea / file-name fallthrough
      if (field.key.includes("email")) {
        const email = z
          .string()
          .trim()
          .email(`Enter a valid email for ${field.label.toLowerCase()}`);
        return required
          ? email.min(1, `${field.label} is required`)
          : z.union([z.literal(""), email]);
      }

      let schema = z.string();
      if (v.minLength) schema = schema.min(v.minLength, `Must be at least ${v.minLength} characters`);
      if (v.maxLength) schema = schema.max(v.maxLength, `Must be at most ${v.maxLength} characters`);
      if (v.pattern) {
        schema = schema.regex(new RegExp(v.pattern), `${field.label} is not in the expected format`);
      }
      return required
        ? schema.min(1, `${field.label} is required`)
        : schema.optional().or(z.literal(""));
    }
  }
}

/** Schema for one wizard step, so we can validate a step without the rest. */
export function buildSectionSchema(section: FormSection, answers: AnswerMap) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of section.fields) {
    if (isPresentational(field)) continue;
    if (!isFieldVisible(field, answers)) continue;
    shape[field.key] = fieldSchema(field, isFieldRequired(field, answers));
  }

  return z.object(shape);
}

/** Schema for the whole submission. This is what the server action enforces. */
export function buildTemplateSchema(template: FormTemplate, answers: AnswerMap) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (isPresentational(field)) continue;
      if (!isFieldVisible(field, answers)) continue;
      shape[field.key] = fieldSchema(field, isFieldRequired(field, answers));
    }
  }

  return z.object(shape);
}

/** Sensible initial values so React Hook Form starts controlled, not undefined. */
export function buildDefaultValues(template: FormTemplate): AnswerMap {
  const values: AnswerMap = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (isPresentational(field)) continue;

      if (field.default_value !== null && field.default_value !== undefined) {
        values[field.key] = field.default_value;
      } else if (field.type === "checkbox") {
        values[field.key] = false;
      } else if (field.type === "toggle") {
        // Unanswered until the pilot taps Yes or No.
        values[field.key] = null;
      } else if (field.type === "number") {
        values[field.key] = "";
      } else {
        values[field.key] = "";
      }
    }
  }

  return values;
}

/** Flatten a template to a lookup so answers can be labelled when displayed. */
export function indexFields(template: FormTemplate) {
  const map = new Map<string, { field: FormField; section: FormSection }>();
  for (const section of template.sections) {
    for (const field of section.fields) {
      map.set(field.key, { field, section });
    }
  }
  return map;
}

/** Render an answer for human display — the approval page relies on this. */
export function displayAnswer(
  field: FormField,
  value: unknown,
  sources: DataSources,
): string {
  if (value === null || value === undefined || value === "") return "—";

  if (field.type === "checkbox" || field.type === "toggle") {
    return value ? "Yes" : "No";
  }

  if (field.type === "select" || field.type === "radio") {
    const options = resolveOptions(field, sources);
    return options.find((o) => o.value === value)?.label ?? String(value);
  }

  // Stored as yyyy-MM-dd / HH:mm; nobody wants to read an ISO string.
  if (field.type === "date" && typeof value === "string") {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  return String(value);
}
