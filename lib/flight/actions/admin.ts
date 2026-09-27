"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminUser } from "@/lib/auth";
import { audit } from "@/lib/flight/audit";
import { getSessionUser } from "@/lib/flight/auth";
import { createServiceSupabase } from "@/lib/flight/supabase/server";
import {
  deleteClubLogoFiles,
  uploadClubLogoFile,
} from "@/lib/flight/storage";
import type { ActionResult } from "@/lib/flight/actions/authorisations";

/** Every export in this file is admin-only; this is the single choke point. */
async function requireAdminActor() {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") return null;
  return user;
}

function denied(): ActionResult {
  return { ok: false, error: "You don't have permission to do that." };
}

function firstIssue(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
}

// ---------------------------------------------------------------------------
// Aircraft
// ---------------------------------------------------------------------------

const aircraftSchema = z.object({
  id: z.string().uuid().optional(),
  registration: z
    .string()
    .trim()
    .min(2, "Registration is required")
    .max(12)
    .transform((v) => v.toUpperCase()),
  aircraft_type: z.string().trim().min(2, "Aircraft type is required").max(80),
  display_name: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(["available", "maintenance", "reserved", "retired"]).default("available"),
  colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value")
    .default("#0F62FE"),
  is_active: z.boolean().default(true),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function upsertAircraft(
  raw: z.input<typeof aircraftSchema>,
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const parsed = aircraftSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = createServiceSupabase();
  const { id, ...values } = parsed.data;

  const payload = {
    ...values,
    display_name: values.display_name || null,
    notes: values.notes || null,
  };

  const { error } = id
    ? await supabase.from("aircraft").update(payload).eq("id", id)
    : await supabase.from("aircraft").insert(payload);

  if (error) {
    // 23505 = unique violation on registration.
    if (error.code === "23505") {
      return { ok: false, error: `${values.registration} is already on the fleet.` };
    }
    return { ok: false, error: "Couldn't save that aircraft." };
  }

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: id ? "aircraft.update" : "aircraft.create",
    entityType: "aircraft",
    entityId: id ?? null,
    after: payload,
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function deleteAircraft(id: string): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();

  // An aircraft referenced by past authorisations must never be hard-deleted —
  // the historical record would lose its meaning. Deactivate instead.
  const { count } = await supabase
    .from("authorisations")
    .select("*", { count: "exact", head: true })
    .eq("aircraft_id", id);

  if ((count ?? 0) > 0) {
    await supabase.from("aircraft").update({ is_active: false }).eq("id", id);
    await audit({
      actorId: user.id,
      action: "aircraft.deactivate",
      entityType: "aircraft",
      entityId: id,
    });
    revalidatePath("/admin/fleet");
    return {
      ok: true,
      error: `This aircraft appears on ${count} past authorisation${count === 1 ? "" : "s"}, so it was disabled rather than deleted.`,
    };
  }

  const { error } = await supabase.from("aircraft").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete that aircraft." };

  await audit({
    actorId: user.id,
    action: "aircraft.delete",
    entityType: "aircraft",
    entityId: id,
  });
  revalidatePath("/admin/fleet");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Instructors
// ---------------------------------------------------------------------------

const instructorSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  permissions: z
    .object({
      can_approve: z.boolean().default(true),
      can_manage_fleet: z.boolean().default(false),
      can_manage_forms: z.boolean().default(false),
    })
    .default({ can_approve: true, can_manage_fleet: false, can_manage_forms: false }),
});

export async function upsertInstructor(
  raw: z.input<typeof instructorSchema>,
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const parsed = instructorSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = createServiceSupabase();
  const { id, ...values } = parsed.data;

  const payload = {
    ...values,
    email: values.email || null,
    phone: values.phone || null,
  };

  const { error } = id
    ? await supabase.from("instructors").update(payload).eq("id", id)
    : await supabase.from("instructors").insert(payload);

  if (error) return { ok: false, error: "Couldn't save that instructor." };

  await audit({
    actorId: user.id,
    action: id ? "instructor.update" : "instructor.create",
    entityType: "instructor",
    entityId: id ?? null,
    after: payload,
  });

  revalidatePath("/admin/instructors");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function deleteInstructor(id: string): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();

  const { count } = await supabase
    .from("authorisations")
    .select("*", { count: "exact", head: true })
    .eq("instructor_id", id);

  if ((count ?? 0) > 0) {
    await supabase.from("instructors").update({ is_active: false }).eq("id", id);
    revalidatePath("/admin/instructors");
    return {
      ok: true,
      error: `This instructor has authorised ${count} flight${count === 1 ? "" : "s"}, so they were disabled rather than deleted.`,
    };
  }

  const { error } = await supabase.from("instructors").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete that instructor." };

  await audit({
    actorId: user.id,
    action: "instructor.delete",
    entityType: "instructor",
    entityId: id,
  });
  revalidatePath("/admin/instructors");
  return { ok: true };
}

/** Persist a drag-to-reorder. Sent as one array so ordering stays consistent. */
export async function reorder(
  table: "aircraft" | "instructors",
  orderedIds: string[],
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from(table).update({ sort_order: index + 1 }).eq("id", id),
    ),
  );

  revalidatePath(`/admin/${table}`);
  revalidatePath("/authorise");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Form builder
// ---------------------------------------------------------------------------

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  section_id: z.string().uuid(),
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase letters, numbers and underscores")
    .max(60),
  label: z.string().trim().min(1, "Label is required").max(200),
  type: z.enum([
    "text", "textarea", "number", "checkbox", "radio", "select", "date",
    "time", "signature", "heading", "info", "paragraph", "toggle", "file",
  ]),
  placeholder: z.string().trim().max(120).optional().or(z.literal("")),
  help_text: z.string().trim().max(400).optional().or(z.literal("")),
  is_required: z.boolean().default(false),
  validation: z.record(z.string(), z.unknown()).default({}),
  options: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .default([]),
  data_source: z
    .enum(["aircraft", "instructors", "pilot.name", "pilot.phone", "pilot.email"])
    .nullable()
    .default(null),
  sort_order: z.number().int().default(0),
});

export async function upsertField(raw: z.input<typeof fieldSchema>): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const parsed = fieldSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = createServiceSupabase();
  const { id, ...values } = parsed.data;

  const payload = {
    ...values,
    placeholder: values.placeholder || null,
    help_text: values.help_text || null,
  };

  const { error } = id
    ? await supabase.from("form_fields").update(payload).eq("id", id)
    : await supabase.from("form_fields").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `A field with the key "${values.key}" already exists here.` };
    }
    return { ok: false, error: "Couldn't save that field." };
  }

  await audit({
    actorId: user.id,
    action: id ? "form_field.update" : "form_field.create",
    entityType: "form_field",
    entityId: id ?? null,
    after: payload,
  });

  revalidatePath("/admin/form-builder");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function deleteField(id: string): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("form_fields").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete that field." };

  await audit({
    actorId: user.id,
    action: "form_field.delete",
    entityType: "form_field",
    entityId: id,
  });
  revalidatePath("/admin/form-builder");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function reorderFields(
  sectionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("form_fields")
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("section_id", sectionId),
    ),
  );

  revalidatePath("/admin/form-builder");
  revalidatePath("/authorise");
  return { ok: true };
}

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase letters, numbers and underscores"),
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  sort_order: z.number().int().default(0),
});

export async function upsertSection(
  raw: z.input<typeof sectionSchema>,
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = createServiceSupabase();
  const { id, ...values } = parsed.data;
  const payload = {
    ...values,
    description: values.description || null,
    icon: values.icon || null,
  };

  const { error } = id
    ? await supabase.from("form_sections").update(payload).eq("id", id)
    : await supabase.from("form_sections").insert(payload);

  if (error) return { ok: false, error: "Couldn't save that section." };

  revalidatePath("/admin/form-builder");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("form_sections").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete that section." };

  revalidatePath("/admin/form-builder");
  revalidatePath("/authorise");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Club settings
// ---------------------------------------------------------------------------

const clubSettingsSchema = z
  .object({
    emails_enabled: z.boolean(),
    member_login_enabled: z.boolean(),
    notification_email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.emails_enabled && !values.notification_email) {
      ctx.addIssue({
        code: "custom",
        path: ["notification_email"],
        message: "Add a central inbox email before enabling notifications.",
      });
    }
  });

export async function updateClubSettings(
  raw: z.input<typeof clubSettingsSchema>,
): Promise<ActionResult> {
  const [user, safetyAdmin] = await Promise.all([
    getSessionUser(),
    getAdminUser(),
  ]);
  const flightAdmin = user?.profile.role === "admin";
  if (!flightAdmin && !safetyAdmin) return denied();

  const parsed = clubSettingsSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = createServiceSupabase();
  const notificationEmail = parsed.data.notification_email || null;
  const emailsEnabled = parsed.data.emails_enabled;
  const memberLoginEnabled = parsed.data.member_login_enabled;

  const { error } = await supabase.from("club_settings").upsert({
    id: true,
    notification_email: notificationEmail,
    emails_enabled: emailsEnabled,
    member_login_enabled: memberLoginEnabled,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  });

  if (error) return { ok: false, error: "Couldn't save club settings." };

  await audit({
    actorId: user?.id ?? safetyAdmin?.id ?? null,
    actorLabel: user?.email ?? safetyAdmin?.email ?? "admin",
    action: "club_settings.update",
    entityType: "club_settings",
    entityId: null,
    after: {
      notification_email: notificationEmail,
      emails_enabled: emailsEnabled,
      member_login_enabled: memberLoginEnabled,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/signup");
  revalidatePath("/authorise/submitted");
  return { ok: true };
}

function revalidateBrandingSurfaces() {
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/signup");
  revalidatePath("/authorise");
}

export async function uploadClubLogo(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a logo file to upload." };
  }

  const uploaded = await uploadClubLogoFile(file);
  if ("error" in uploaded) return { ok: false, error: uploaded.error };

  const supabase = createServiceSupabase();
  const { error } = await supabase.from("club_settings").upsert({
    id: true,
    logo_path: uploaded.path,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (error) return { ok: false, error: "Logo uploaded, but settings didn't save." };

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "club_settings.logo_upload",
    entityType: "club_settings",
    entityId: null,
    after: { logo_path: uploaded.path },
  });

  revalidateBrandingSurfaces();
  return { ok: true };
}

export async function removeClubLogo(): Promise<ActionResult> {
  const user = await requireAdminActor();
  if (!user) return denied();

  const supabase = createServiceSupabase();
  const { data: current } = await supabase
    .from("club_settings")
    .select("logo_path")
    .eq("id", true)
    .maybeSingle();

  await deleteClubLogoFiles(current?.logo_path ?? null);

  const { error } = await supabase.from("club_settings").upsert({
    id: true,
    logo_path: null,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (error) return { ok: false, error: "Couldn't remove the logo." };

  await audit({
    actorId: user.id,
    actorLabel: user.email,
    action: "club_settings.logo_remove",
    entityType: "club_settings",
    entityId: null,
    after: { logo_path: null },
  });

  revalidateBrandingSurfaces();
  return { ok: true };
}

export async function duplicateTemplate(id: string): Promise<ActionResult> {
  const admin = await requireAdminActor();
  if (!admin) return denied();

  const supabase = await createServiceSupabase();

  // Fetch the source template
  const { data: source, error: fetchError } = await supabase
    .from("form_templates")
    .select("*, form_sections(*, form_fields(*))")
    .eq("id", id)
    .single();

  if (fetchError || !source) {
    return { ok: false, error: "Source template not found." };
  }

  // Create new template
  const { data: newTemplate, error: insertError } = await supabase
    .from("form_templates")
    .insert({
      name: `${source.name} (Copy)`,
      description: source.description,
      is_active: false,
      version: 1, // Reset version for new template
      created_by: admin.profile.id,
    })
    .select()
    .single();

  if (insertError) {
    return { ok: false, error: "Failed to duplicate template." };
  }

  // Duplicate sections
  if (source.form_sections && source.form_sections.length > 0) {
    type SourceField = {
      key: string;
      label: string;
      type: string;
      placeholder: string | null;
      help_text: string | null;
      is_required: boolean;
      validation: unknown;
      options: unknown;
      data_source: string | null;
      sort_order: number;
      visible_when: unknown;
    };
    type SourceSection = {
      key: string;
      title: string;
      description: string | null;
      icon: string | null;
      sort_order: number;
      form_fields?: SourceField[] | null;
    };

    const sourceSections = source.form_sections as SourceSection[];
    const sectionsToInsert = sourceSections.map((s) => ({
      template_id: newTemplate.id,
      key: s.key,
      title: s.title,
      description: s.description,
      icon: s.icon,
      sort_order: s.sort_order,
    }));

    const { data: newSections, error: sectionsError } = await supabase
      .from("form_sections")
      .insert(sectionsToInsert)
      .select();

    if (sectionsError) {
      return { ok: false, error: "Failed to duplicate sections." };
    }

    // Duplicate fields
    const fieldsToInsert = [];
    for (const sourceSection of sourceSections) {
      const newSection = newSections.find((s) => s.key === sourceSection.key);
      if (newSection && sourceSection.form_fields) {
        for (const f of sourceSection.form_fields) {
          fieldsToInsert.push({
            section_id: newSection.id,
            key: f.key,
            label: f.label,
            type: f.type,
            placeholder: f.placeholder,
            help_text: f.help_text,
            is_required: f.is_required,
            validation: f.validation,
            options: f.options,
            data_source: f.data_source,
            sort_order: f.sort_order,
            visible_when: f.visible_when,
          });
        }
      }
    }

    if (fieldsToInsert.length > 0) {
      const { error: fieldsError } = await supabase
        .from("form_fields")
        .insert(fieldsToInsert);

      if (fieldsError) {
        return { ok: false, error: "Failed to duplicate fields." };
      }
    }
  }

  revalidatePath("/admin/form-builder");
  return { ok: true };
}

const templateMetaSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
});

/** Rename a form template (and optionally update its description). */
export async function updateTemplateMeta(
  raw: z.input<typeof templateMetaSchema>,
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  if (!admin) return denied();

  const parsed = templateMetaSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);

  const { id, name, description } = parsed.data;
  const supabase = createServiceSupabase();

  const { error } = await supabase
    .from("form_templates")
    .update({
      name,
      description: description ? description : null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Couldn't rename this form." };
  }

  await audit({
    actorId: admin.profile.id,
    action: "template.rename",
    entityType: "form_template",
    entityId: id,
    after: { name, description: description || null },
  });

  revalidatePath("/admin/form-builder");
  revalidatePath(`/admin/form-builder/${id}`);
  revalidatePath("/authorise");
  return { ok: true };
}

/**
 * Publish (make live) or move a template back to draft.
 * Multiple forms can be published at the same time — pilots pick which to complete.
 */
export async function setTemplateVisibility(
  id: string,
  visibility: "published" | "draft",
): Promise<ActionResult> {
  const admin = await requireAdminActor();
  if (!admin) return denied();

  const supabase = createServiceSupabase();

  const { data: template, error: fetchError } = await supabase
    .from("form_templates")
    .select("id, name, is_active")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !template) {
    return { ok: false, error: "Template not found." };
  }

  if (visibility === "published") {
    if (template.is_active) {
      return { ok: true };
    }

    const { error: publishError } = await supabase
      .from("form_templates")
      .update({
        is_active: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (publishError) {
      return { ok: false, error: "Couldn't publish this form." };
    }

    await audit({
      actorId: admin.profile.id,
      action: "template.publish",
      entityType: "form_template",
      entityId: id,
      after: { name: template.name, visibility: "published" },
    });

    revalidatePath("/admin/form-builder");
    revalidatePath(`/admin/form-builder/${id}`);
    revalidatePath("/authorise");
    return { ok: true };
  }

  // Move to draft
  if (!template.is_active) {
    return { ok: true };
  }

  const { error: draftError } = await supabase
    .from("form_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (draftError) {
    return { ok: false, error: "Couldn't move this form to draft." };
  }

  await audit({
    actorId: admin.profile.id,
    action: "template.unpublish",
    entityType: "form_template",
    entityId: id,
    after: {
      name: template.name,
      visibility: "draft",
    },
  });

  revalidatePath("/admin/form-builder");
  revalidatePath(`/admin/form-builder/${id}`);
  revalidatePath("/authorise");
  return { ok: true };
}
