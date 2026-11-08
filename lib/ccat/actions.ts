"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { EventKind } from "@/lib/ccat/types";
import { hasRole, requireUser } from "@/lib/flight/auth";
import { createServerSupabase } from "@/lib/flight/supabase/server";

export interface CcatActionResult {
  ok: boolean;
  error?: string;
  inserted?: number;
  skipped?: number;
}

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const hours = z.number().min(0).max(24);
const optionalText = z.string().trim().max(4000).optional().transform((value) => value || null);

function denied(): CcatActionResult {
  return { ok: false, error: "You don't have permission to do that." };
}

async function requireInstructor() {
  const user = await requireUser();
  if (!hasRole(user.profile.role, "instructor")) return null;
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.profile.role !== "admin") return null;
  return user;
}

function refresh(studentId?: string) {
  revalidatePath("/training");
  revalidatePath("/training/flights");
  revalidatePath("/training/planner");
  revalidatePath("/training/syllabus");
  revalidatePath("/training/import");
  revalidatePath("/training/me");
  if (studentId) revalidatePath(`/training/students/${studentId}`);
}

function failure(error: { message?: string } | null, fallback: string): string {
  const message = error?.message ?? "";
  if (message.includes("syllabus item") || message.includes("Flight does not belong")) return message;
  if (message.includes("ccat_events_import_key")) return "That record was already imported.";
  return fallback;
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown>,
) {
  await supabase.from("ccat_audit").insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    detail,
  });
}

const flightSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  flownOn: dateKey,
  aircraftId: z.string().uuid().optional().or(z.literal("")),
  registration: z.string().trim().max(20).optional().transform((value) => value || null),
  instructorId: z.string().uuid().optional().or(z.literal("")),
  dualHours: hours,
  soloHours: hours,
  notes: optionalText,
  learntItemIds: z.array(z.string().uuid()).max(28),
  taughtItemIds: z.array(z.string().uuid()).max(28),
});

export async function saveFlight(input: unknown): Promise<CcatActionResult> {
  const actor = await requireInstructor();
  if (!actor) return denied();
  const parsed = flightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the flight details." };
  if (parsed.data.learntItemIds.length + parsed.data.taughtItemIds.length === 0) {
    return { ok: false, error: "Choose at least one learnt or taught exercise." };
  }

  const supabase = await createServerSupabase();
  const instructor = await instructorStamp(supabase, parsed.data.instructorId || null, actor.profile.full_name);
  const aircraft = await aircraftStamp(supabase, parsed.data.aircraftId || null, parsed.data.registration);
  const flightPayload = {
    student_id: parsed.data.studentId,
    flown_on: parsed.data.flownOn,
    aircraft_id: aircraft.id,
    aircraft_registration: aircraft.registration,
    instructor_id: instructor.id,
    instructor_name: instructor.name,
    dual_hours: parsed.data.dualHours,
    solo_hours: parsed.data.soloHours,
    notes: parsed.data.notes,
    updated_by: actor.id,
  };

  let flightId = parsed.data.id ?? null;
  if (flightId) {
    const { error } = await supabase.from("ccat_flights").update(flightPayload).eq("id", flightId).is("voided_at", null);
    if (error) return { ok: false, error: failure(error, "Could not update the flight.") };
  } else {
    const { data, error } = await supabase
      .from("ccat_flights")
      .insert({ ...flightPayload, created_by: actor.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: failure(error, "Could not save the flight.") };
    flightId = (data as { id: string }).id;
  }

  const sync = await syncFlightEvents(supabase, {
    flightId,
    studentId: parsed.data.studentId,
    eventDate: parsed.data.flownOn,
    instructorId: instructor.id,
    instructorName: instructor.name,
    learntItemIds: parsed.data.learntItemIds,
    taughtItemIds: parsed.data.taughtItemIds,
    actorId: actor.id,
  });
  if (!sync.ok) return sync;

  await writeAudit(supabase, actor.id, parsed.data.id ? "update" : "create", "flight", flightId, {
    studentId: parsed.data.studentId,
    learnt: parsed.data.learntItemIds,
    taught: parsed.data.taughtItemIds,
  });
  refresh(parsed.data.studentId);
  return { ok: true };
}

async function syncFlightEvents(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  input: {
    flightId: string;
    studentId: string;
    eventDate: string;
    instructorId: string | null;
    instructorName: string | null;
    learntItemIds: string[];
    taughtItemIds: string[];
    actorId: string;
  },
): Promise<CcatActionResult> {
  const wanted = new Map<string, EventKind>();
  for (const itemId of input.taughtItemIds) wanted.set(`${itemId}:taught`, "taught");
  for (const itemId of input.learntItemIds) wanted.set(`${itemId}:learnt`, "learnt");

  const { data: existing, error: existingError } = await supabase
    .from("ccat_events")
    .select("id, item_id, kind, voided_at")
    .eq("flight_id", input.flightId);
  if (existingError) return { ok: false, error: "Could not read the exercises on this flight." };

  const rows = (existing ?? []) as { id: string; item_id: string; kind: EventKind; voided_at: string | null }[];
  for (const row of rows) {
    if (row.voided_at) continue;
    const key = `${row.item_id}:${row.kind}`;
    if (wanted.has(key)) wanted.delete(key);
    else {
      const { error } = await supabase
        .from("ccat_events")
        .update({ voided_at: new Date().toISOString(), updated_by: input.actorId })
        .eq("id", row.id);
      if (error) return { ok: false, error: "Could not update the exercises on this flight." };
    }
  }

  if (wanted.size > 0) {
    const { error } = await supabase.from("ccat_events").insert(
      [...wanted.entries()].map(([key, kind]) => ({
        student_id: input.studentId,
        item_id: key.slice(0, key.lastIndexOf(":")),
        flight_id: input.flightId,
        kind,
        event_date: input.eventDate,
        instructor_id: input.instructorId,
        instructor_name: input.instructorName,
        source: "manual",
        created_by: input.actorId,
        updated_by: input.actorId,
      })),
    );
    if (error) return { ok: false, error: failure(error, "Could not record the exercises.") };
  }
  return { ok: true };
}

export async function voidFlight(id: string): Promise<CcatActionResult> {
  const actor = await requireInstructor();
  if (!actor) return denied();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That flight could not be found." };
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ccat_flights")
    .update({ voided_at: now, updated_by: actor.id })
    .eq("id", parsed.data)
    .is("voided_at", null)
    .select("student_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not remove the flight." };
  await supabase
    .from("ccat_events")
    .update({ voided_at: now, updated_by: actor.id })
    .eq("flight_id", parsed.data)
    .is("voided_at", null);
  const studentId = (data as { student_id: string }).student_id;
  await writeAudit(supabase, actor.id, "void", "flight", parsed.data, { studentId });
  refresh(studentId);
  return { ok: true };
}

const signoffSchema = z.object({
  studentId: z.string().uuid(),
  itemId: z.string().uuid(),
  kind: z.enum(["learnt", "taught", "completed"]),
  eventDate: dateKey,
  instructorId: z.string().uuid().optional().or(z.literal("")),
  notes: optionalText,
});

export async function recordSignoff(input: unknown): Promise<CcatActionResult> {
  const actor = await requireInstructor();
  if (!actor) return denied();
  const parsed = signoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the sign-off." };
  const supabase = await createServerSupabase();
  const instructor = await instructorStamp(supabase, parsed.data.instructorId || null, actor.profile.full_name);
  const { error } = await supabase.from("ccat_events").insert({
    student_id: parsed.data.studentId,
    item_id: parsed.data.itemId,
    kind: parsed.data.kind,
    event_date: parsed.data.eventDate,
    instructor_id: instructor.id,
    instructor_name: instructor.name,
    notes: parsed.data.notes,
    source: "manual",
    created_by: actor.id,
    updated_by: actor.id,
  });
  if (error) return { ok: false, error: failure(error, "Could not record the sign-off.") };
  await writeAudit(supabase, actor.id, "signoff", "event", parsed.data.itemId, {
    studentId: parsed.data.studentId,
    kind: parsed.data.kind,
    date: parsed.data.eventDate,
  });
  refresh(parsed.data.studentId);
  return { ok: true };
}

export async function voidSignoff(id: string): Promise<CcatActionResult> {
  const actor = await requireInstructor();
  if (!actor) return denied();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That sign-off could not be found." };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("ccat_events")
    .update({ voided_at: new Date().toISOString(), updated_by: actor.id })
    .eq("id", parsed.data)
    .is("voided_at", null)
    .select("student_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not remove the sign-off." };
  const studentId = (data as { student_id: string }).student_id;
  await writeAudit(supabase, actor.id, "void", "event", parsed.data, { studentId });
  refresh(studentId);
  return { ok: true };
}

const intakeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  startsOn: dateKey.optional().or(z.literal("")),
  status: z.enum(["active", "archived"]),
});

export async function saveIntake(input: unknown): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the intake." };
  const supabase = await createServerSupabase();
  const payload = {
    name: parsed.data.name,
    starts_on: parsed.data.startsOn || null,
    status: parsed.data.status,
  };
  const query = parsed.data.id
    ? supabase.from("ccat_intakes").update(payload).eq("id", parsed.data.id)
    : supabase.from("ccat_intakes").insert({ ...payload, created_by: actor.id });
  const { error } = await query;
  if (error) return { ok: false, error: "Could not save the intake." };
  await writeAudit(supabase, actor.id, parsed.data.id ? "update" : "create", "intake", parsed.data.id ?? null, payload);
  refresh();
  return { ok: true };
}

const studentSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(1, "Name is required.").max(120),
  intakeId: z.string().uuid().optional().or(z.literal("")),
  profileId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "completed", "withdrawn"]),
  startedOn: dateKey.optional().or(z.literal("")),
  notes: optionalText,
});

export async function saveStudent(input: unknown): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the student." };
  const supabase = await createServerSupabase();
  const payload = {
    full_name: parsed.data.fullName,
    intake_id: parsed.data.intakeId || null,
    profile_id: parsed.data.profileId || null,
    status: parsed.data.status,
    started_on: parsed.data.startedOn || null,
    notes: parsed.data.notes,
  };
  const query = parsed.data.id
    ? supabase.from("ccat_students").update(payload).eq("id", parsed.data.id).select("id").single()
    : supabase.from("ccat_students").insert({ ...payload, created_by: actor.id }).select("id").single();
  const { data, error } = await query;
  if (error || !data) {
    if (error?.message.includes("ccat_students_profile_id")) {
      return { ok: false, error: "That login is already linked to a C Cat student." };
    }
    return { ok: false, error: "Could not save the student." };
  }
  const id = (data as { id: string }).id;
  await writeAudit(supabase, actor.id, parsed.data.id ? "update" : "create", "student", id, {
    name: parsed.data.fullName,
    intakeId: payload.intake_id,
    status: payload.status,
  });
  refresh(id);
  return { ok: true };
}

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required.").max(160),
  signoffMode: z.enum(["learnt_taught", "single"]).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export async function saveSyllabusItem(input: unknown): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the syllabus item." };
  const supabase = await createServerSupabase();
  const mode = parsed.data.signoffMode || null;
  if (parsed.data.id) {
    const { error } = await supabase
      .from("ccat_items")
      .update({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        signoff_mode: mode,
        is_active: parsed.data.isActive,
      })
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: "Could not update the syllabus item." };
    await writeAudit(supabase, actor.id, "update", "item", parsed.data.id, { name: parsed.data.name });
    refresh();
    return { ok: true };
  }

  const { data: last, error: lastError } = await supabase
    .from("ccat_items")
    .select("sort_order")
    .eq("category_id", parsed.data.categoryId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (lastError) return { ok: false, error: "Could not add the syllabus item." };
  const next = ((last?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1;
  const { data, error } = await supabase
    .from("ccat_items")
    .insert({
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      sort_order: next,
      signoff_mode: mode,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not add the syllabus item." };
  await writeAudit(supabase, actor.id, "create", "item", (data as { id: string }).id, { name: parsed.data.name });
  refresh();
  return { ok: true };
}

export async function moveSyllabusItem(id: string, direction: "up" | "down"): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That syllabus item could not be found." };
  const supabase = await createServerSupabase();
  const { data: current, error } = await supabase
    .from("ccat_items")
    .select("id, category_id, sort_order")
    .eq("id", parsed.data)
    .single();
  if (error || !current) return { ok: false, error: "That syllabus item could not be found." };
  const row = current as { id: string; category_id: string; sort_order: number };
  const { data: neighbours } = direction === "up"
    ? await supabase
      .from("ccat_items")
      .select("id, sort_order")
      .eq("category_id", row.category_id)
      .lt("sort_order", row.sort_order)
      .order("sort_order", { ascending: false })
      .limit(1)
    : await supabase
      .from("ccat_items")
      .select("id, sort_order")
      .eq("category_id", row.category_id)
      .gt("sort_order", row.sort_order)
      .order("sort_order", { ascending: true })
      .limit(1);
  const neighbour = (neighbours?.[0] as { id: string; sort_order: number } | undefined) ?? null;
  if (!neighbour) return { ok: true };
  const { error: firstError } = await supabase.from("ccat_items").update({ sort_order: neighbour.sort_order }).eq("id", row.id);
  const { error: secondError } = await supabase.from("ccat_items").update({ sort_order: row.sort_order }).eq("id", neighbour.id);
  if (firstError || secondError) return { ok: false, error: "Could not reorder the syllabus." };
  refresh();
  return { ok: true };
}

export async function deleteSyllabusItem(id: string): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That syllabus item could not be found." };
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("ccat_events")
    .select("id", { count: "exact", head: true })
    .eq("item_id", parsed.data);
  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("ccat_items").update({ is_active: false }).eq("id", parsed.data);
    if (error) return { ok: false, error: "Could not disable the syllabus item." };
    await writeAudit(supabase, actor.id, "disable", "item", parsed.data, {});
    refresh();
    return { ok: true, error: "This item has training records, so it was disabled instead of deleted." };
  }
  const { error } = await supabase.from("ccat_items").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: "Could not delete the syllabus item." };
  await writeAudit(supabase, actor.id, "delete", "item", parsed.data, {});
  refresh();
  return { ok: true };
}

const planSchema = z.object({
  weekStart: dateKey,
  plans: z.array(z.object({
    studentId: z.string().uuid(),
    instructorId: z.string().uuid().optional().or(z.literal("")),
    aircraftRegistration: z.string().trim().max(20).optional().transform((value) => value || null),
    notes: optionalText,
    learntItemIds: z.array(z.string().uuid()).max(28),
    taughtItemIds: z.array(z.string().uuid()).max(28),
  })).max(80),
});

export async function saveWeekPlan(input: unknown): Promise<CcatActionResult> {
  const actor = await requireInstructor();
  if (!actor) return denied();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the weekly plan." };
  const [year, month, day] = parsed.data.weekStart.split("-").map(Number);
  const week = new Date(Date.UTC(year, month - 1, day));
  if (week.getUTCDay() !== 1) return { ok: false, error: "Choose a week starting on Monday." };

  const supabase = await createServerSupabase();
  const { error: deleteError } = await supabase.from("ccat_plans").delete().eq("week_start", parsed.data.weekStart);
  if (deleteError) return { ok: false, error: "Could not update the weekly plan." };

  for (const plan of parsed.data.plans) {
    const { data, error } = await supabase
      .from("ccat_plans")
      .insert({
        week_start: parsed.data.weekStart,
        student_id: plan.studentId,
        instructor_id: plan.instructorId || null,
        aircraft_registration: plan.aircraftRegistration,
        notes: plan.notes,
        created_by: actor.id,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Could not save the weekly plan." };
    const planId = (data as { id: string }).id;
    const items = [
      ...plan.taughtItemIds.map((itemId) => ({ plan_id: planId, item_id: itemId, kind: "taught" })),
      ...plan.learntItemIds.map((itemId) => ({ plan_id: planId, item_id: itemId, kind: "learnt" })),
    ];
    if (items.length > 0) {
      const { error: itemError } = await supabase.from("ccat_plan_items").insert(items);
      if (itemError) return { ok: false, error: "Could not save the planned exercises." };
    }
  }
  await writeAudit(supabase, actor.id, "save", "plan", null, {
    weekStart: parsed.data.weekStart,
    students: parsed.data.plans.length,
  });
  refresh();
  return { ok: true };
}

const importSchema = z.object({
  records: z.array(z.discriminatedUnion("type", [
    z.object({
      type: z.literal("flight"),
      importKey: z.string().min(8).max(300),
      studentId: z.string().uuid(),
      instructorId: z.string().uuid().nullable(),
      instructorName: z.string().trim().max(120).nullable(),
      date: dateKey,
      registration: z.string().trim().max(20).nullable(),
      dualHours: hours,
      soloHours: hours,
      notes: z.string().trim().max(4000).nullable(),
      learntItemIds: z.array(z.string().uuid()).max(28),
      taughtItemIds: z.array(z.string().uuid()).max(28),
    }),
    z.object({
      type: z.literal("signoff"),
      importKey: z.string().min(8).max(300),
      studentId: z.string().uuid(),
      instructorId: z.string().uuid().nullable(),
      instructorName: z.string().trim().max(120).nullable(),
      itemId: z.string().uuid(),
      kind: z.enum(["learnt", "taught", "completed"]),
      date: dateKey,
      notes: z.string().trim().max(4000).nullable(),
    }),
  ])).max(500),
});

export async function confirmImport(input: unknown): Promise<CcatActionResult> {
  const actor = await requireAdmin();
  if (!actor) return denied();
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the import." };
  if (parsed.data.records.length === 0) return { ok: false, error: "Nothing is ready to import." };

  const supabase = await createServerSupabase();
  const keys = parsed.data.records.map((record) => record.importKey);
  const { data: existing } = await supabase.from("ccat_events").select("import_key").in("import_key", keys);
  const seen = new Set(((existing ?? []) as { import_key: string | null }[]).map((row) => row.import_key).filter(Boolean));
  let inserted = 0;
  let skipped = 0;

  for (const record of parsed.data.records) {
    if (seen.has(record.importKey)) {
      skipped += 1;
      continue;
    }
    if (record.type === "signoff") {
      const { error } = await supabase.from("ccat_events").insert({
        student_id: record.studentId,
        item_id: record.itemId,
        kind: record.kind,
        event_date: record.date,
        instructor_id: record.instructorId,
        instructor_name: record.instructorName,
        notes: record.notes,
        source: "import",
        import_key: record.importKey,
        created_by: actor.id,
        updated_by: actor.id,
      });
      if (error) {
        if (error.message.includes("ccat_events_import_key")) {
          skipped += 1;
          continue;
        }
        return { ok: false, error: failure(error, "Import stopped before every row was saved."), inserted, skipped };
      }
      seen.add(record.importKey);
      inserted += 1;
      continue;
    }

    if (record.learntItemIds.length + record.taughtItemIds.length === 0) {
      skipped += 1;
      continue;
    }
    const { data: flight, error: flightError } = await supabase
      .from("ccat_flights")
      .insert({
        student_id: record.studentId,
        flown_on: record.date,
        aircraft_registration: record.registration,
        instructor_id: record.instructorId,
        instructor_name: record.instructorName,
        dual_hours: record.dualHours,
        solo_hours: record.soloHours,
        notes: record.notes,
        created_by: actor.id,
        updated_by: actor.id,
      })
      .select("id")
      .single();
    if (flightError || !flight) return { ok: false, error: "Import stopped while saving a flight.", inserted, skipped };
    const flightId = (flight as { id: string }).id;
    const events = [
      ...record.taughtItemIds.map((itemId, index) => ({ itemId, kind: "taught" as const, index })),
      ...record.learntItemIds.map((itemId, index) => ({ itemId, kind: "learnt" as const, index })),
    ];
    const { error: eventError } = await supabase.from("ccat_events").insert(
      events.map((event) => ({
        student_id: record.studentId,
        item_id: event.itemId,
        flight_id: flightId,
        kind: event.kind,
        event_date: record.date,
        instructor_id: record.instructorId,
        instructor_name: record.instructorName,
        source: "import",
        import_key: events.length === 1 ? record.importKey : `${record.importKey}:${event.kind}:${event.itemId}`,
        created_by: actor.id,
        updated_by: actor.id,
      })),
    );
    if (eventError) return { ok: false, error: failure(eventError, "Import stopped while saving exercises."), inserted, skipped };
    seen.add(record.importKey);
    inserted += 1;
  }

  await writeAudit(supabase, actor.id, "import", "import", null, { inserted, skipped });
  refresh();
  return { ok: true, inserted, skipped };
}

async function instructorStamp(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  instructorId: string | null,
  fallbackName: string | null,
) {
  if (!instructorId) return { id: null, name: fallbackName };
  const { data } = await supabase.from("instructors").select("id, full_name").eq("id", instructorId).maybeSingle();
  if (!data) return { id: null, name: fallbackName };
  const row = data as { id: string; full_name: string };
  return { id: row.id, name: row.full_name };
}

async function aircraftStamp(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  aircraftId: string | null,
  registration: string | null,
) {
  if (!aircraftId) return { id: null, registration };
  const { data } = await supabase.from("aircraft").select("id, registration").eq("id", aircraftId).maybeSingle();
  if (!data) return { id: null, registration };
  const row = data as { id: string; registration: string };
  return { id: row.id, registration: row.registration };
}
