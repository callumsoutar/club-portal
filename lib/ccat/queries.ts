import "server-only";

import { cache } from "react";

import { roundHours, studentProgress, type StudentProgress } from "@/lib/ccat/progress";
import type {
  CcatAudit,
  CcatEvent,
  CcatFlight,
  CcatIntake,
  CcatItem,
  CcatPlan,
  CcatStudent,
  EventKind,
  SignoffMode,
} from "@/lib/ccat/types";
import { createServerSupabase } from "@/lib/flight/supabase/server";

export interface CcatDirectory {
  intakes: CcatIntake[];
  students: CcatStudent[];
  categories: { id: string; key: string; name: string; sortOrder: number; signoffMode: SignoffMode }[];
  items: CcatItem[];
  flights: CcatFlight[];
  events: CcatEvent[];
  plans: CcatPlan[];
  audits: CcatAudit[];
}

interface CategoryRow {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  signoff_mode: SignoffMode;
}

interface ItemRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  signoff_mode: SignoffMode | null;
}

export const getCcatDirectory = cache(async (): Promise<CcatDirectory> => {
  const supabase = await createServerSupabase();
  const [intakes, students, categories, items, flights, events, plans, planItems, audits] = await Promise.all([
    supabase.from("ccat_intakes").select("id, name, starts_on, status").order("starts_on", { ascending: false }),
    supabase.from("ccat_students").select("id, full_name, profile_id, intake_id, status, started_on, notes").order("full_name"),
    supabase.from("ccat_categories").select("id, key, name, sort_order, signoff_mode").order("sort_order"),
    supabase.from("ccat_items").select("id, category_id, name, sort_order, is_active, signoff_mode").order("sort_order"),
    supabase
      .from("ccat_flights")
      .select("id, student_id, flown_on, aircraft_id, aircraft_registration, instructor_id, instructor_name, dual_hours, solo_hours, notes, voided_at")
      .order("flown_on", { ascending: false }),
    supabase
      .from("ccat_events")
      .select("id, student_id, item_id, flight_id, kind, event_date, instructor_id, instructor_name, notes, source, import_key, voided_at")
      .order("event_date", { ascending: false }),
    supabase.from("ccat_plans").select("id, week_start, student_id, instructor_id, aircraft_registration, notes"),
    supabase.from("ccat_plan_items").select("plan_id, item_id, kind"),
    supabase.from("ccat_audit").select("id, action, entity, entity_id, detail, created_at").order("created_at", { ascending: false }).limit(40),
  ]);

  const categoryRows = (categories.data ?? []) as CategoryRow[];
  const itemRows = ((items.data ?? []) as ItemRow[]).map((row) => {
    const category = categoryRows.find((entry) => entry.id === row.category_id);
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryKey: category?.key ?? "",
      categoryName: category?.name ?? "",
      categorySort: category?.sort_order ?? 0,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      signoffMode: row.signoff_mode ?? category?.signoff_mode ?? "single",
    } satisfies CcatItem;
  });

  const eventRows = ((events.data ?? []) as Record<string, unknown>[]).map(mapEvent);
  const flightRows = ((flights.data ?? []) as Record<string, unknown>[]).map((row) => mapFlight(row, eventRows, itemRows));
  const planItemRows = (planItems.data ?? []) as { plan_id: string; item_id: string; kind: EventKind }[];

  return {
    categories: categoryRows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      sortOrder: row.sort_order,
      signoffMode: row.signoff_mode,
    })),
    intakes: ((intakes.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      startsOn: (row.starts_on as string | null) ?? null,
      status: row.status === "archived" ? "archived" : "active",
    })),
    students: ((students.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      fullName: String(row.full_name),
      profileId: (row.profile_id as string | null) ?? null,
      intakeId: (row.intake_id as string | null) ?? null,
      status: row.status === "completed" || row.status === "withdrawn" ? row.status : "active",
      startedOn: (row.started_on as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    })),
    items: itemRows,
    flights: flightRows,
    events: eventRows,
    plans: ((plans.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      weekStart: String(row.week_start),
      studentId: String(row.student_id),
      instructorId: (row.instructor_id as string | null) ?? null,
      aircraftRegistration: (row.aircraft_registration as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      items: planItemRows
        .filter((item) => item.plan_id === row.id)
        .map((item) => ({ itemId: item.item_id, kind: item.kind })),
    })),
    audits: ((audits.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      action: String(row.action),
      entity: String(row.entity),
      entityId: (row.entity_id as string | null) ?? null,
      detail: (row.detail as Record<string, unknown> | null) ?? {},
      createdAt: String(row.created_at),
    })),
  };
});

function mapEvent(row: Record<string, unknown>): CcatEvent {
  const kind = row.kind === "taught" || row.kind === "completed" ? row.kind : "learnt";
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    itemId: String(row.item_id),
    flightId: (row.flight_id as string | null) ?? null,
    kind,
    eventDate: String(row.event_date),
    instructorId: (row.instructor_id as string | null) ?? null,
    instructorName: (row.instructor_name as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    source: row.source === "import" ? "import" : "manual",
    importKey: (row.import_key as string | null) ?? null,
    voidedAt: (row.voided_at as string | null) ?? null,
  };
}

function mapFlight(row: Record<string, unknown>, events: CcatEvent[], items: CcatItem[]): CcatFlight {
  const related = events.filter((event) => event.flightId === row.id && !event.voidedAt);
  const named = (kind: EventKind) =>
    related
      .filter((event) => event.kind === kind)
      .map((event) => ({
        id: event.itemId,
        name: items.find((item) => item.id === event.itemId)?.name ?? "Exercise",
      }));
  const learnt = named("learnt");
  const taught = named("taught");
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    flownOn: String(row.flown_on),
    aircraftId: (row.aircraft_id as string | null) ?? null,
    aircraftRegistration: (row.aircraft_registration as string | null) ?? null,
    instructorId: (row.instructor_id as string | null) ?? null,
    instructorName: (row.instructor_name as string | null) ?? null,
    dualHours: roundHours(Number(row.dual_hours ?? 0)),
    soloHours: roundHours(Number(row.solo_hours ?? 0)),
    notes: (row.notes as string | null) ?? null,
    voidedAt: (row.voided_at as string | null) ?? null,
    learnt: learnt.map((item) => item.name),
    taught: taught.map((item) => item.name),
    learntItemIds: learnt.map((item) => item.id),
    taughtItemIds: taught.map((item) => item.id),
  };
}

export function progressFor(directory: CcatDirectory): StudentProgress[] {
  return directory.students.map((student) =>
    studentProgress(student, directory.items, directory.events, directory.flights),
  );
}

export async function getLinkedProfiles() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");
  return ((data ?? []) as { id: string; full_name: string | null; email: string }[]).map((row) => ({
    id: row.id,
    fullName: row.full_name?.trim() || row.email,
    email: row.email,
  }));
}
