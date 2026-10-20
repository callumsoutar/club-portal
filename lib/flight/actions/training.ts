"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasRole, requireUser } from "@/lib/flight/auth";
import { createServerSupabase } from "@/lib/flight/supabase/server";

export interface TrainingActionResult {
  ok: boolean;
  error?: string;
}

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const optionalText = z.string().trim().max(4000).optional().transform((value) => value || null);

function denied(): TrainingActionResult {
  return { ok: false, error: "You don't have permission to do that." };
}

async function requireStaff() {
  const user = await requireUser();
  if (!hasRole(user.profile.role, "instructor")) return null;
  return user;
}

function refresh() {
  revalidatePath("/fly/instructor/training");
  revalidatePath("/admin/settings");
}

const syllabusSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).optional().transform((value) => value || null),
  licenceType: z.enum(["student", "rpl", "ppl", "cpl", "atpl", "instructor"]).optional().or(z.literal("")),
});

export async function createSyllabus(input: unknown): Promise<TrainingActionResult> {
  const actor = await requireStaff();
  if (!actor || actor.profile.role !== "admin") return denied();
  const parsed = syllabusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid syllabus." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("syllabus").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    licence_type: parsed.data.licenceType || null,
  });
  if (error) return { ok: false, error: "Could not create the syllabus." };
  refresh();
  return { ok: true };
}

const lessonSchema = z.object({
  syllabusId: z.string().uuid(),
  name: z.string().trim().min(1, "Lesson name is required.").max(160),
  isRequired: z.boolean(),
});

export async function createLesson(input: unknown): Promise<TrainingActionResult> {
  const actor = await requireStaff();
  if (!actor || actor.profile.role !== "admin") return denied();
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lesson." };

  const supabase = await createServerSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("syllabus_id", parsed.data.syllabusId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (existingError) return { ok: false, error: "Could not add the lesson." };
  const nextOrder = ((existing?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("lessons").insert({
    syllabus_id: parsed.data.syllabusId,
    name: parsed.data.name,
    sort_order: nextOrder,
    is_required: parsed.data.isRequired,
  });
  if (error) return { ok: false, error: "Could not add the lesson." };
  refresh();
  return { ok: true };
}

const enrollSchema = z.object({
  userId: z.string().uuid(),
  syllabusId: z.string().uuid(),
  instructorId: z.string().uuid().optional().or(z.literal("")),
});

export async function enrollStudent(input: unknown): Promise<TrainingActionResult> {
  const actor = await requireStaff();
  if (!actor || actor.profile.role !== "admin") return denied();
  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid enrolment." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("student_syllabus_enrollment").insert({
    user_id: parsed.data.userId,
    syllabus_id: parsed.data.syllabusId,
    primary_instructor_id: parsed.data.instructorId || null,
    status: "active",
  });
  if (error?.code === "23505") {
    return { ok: false, error: "That student is already enrolled in this syllabus." };
  }
  if (error) return { ok: false, error: "Could not enrol the student." };
  refresh();
  return { ok: true };
}

const recordSchema = z.object({
  userId: z.string().uuid(),
  lessonId: z.string().uuid().optional().or(z.literal("")),
  lessonTitle: z.string().trim().max(200).optional().transform((value) => value || null),
  date: dateKey,
  status: z.enum(["pass", "not yet competent"]),
  instructorId: z.string().uuid().optional().or(z.literal("")),
  instructorComments: optionalText,
  lessonHighlights: optionalText,
  areasForImprovement: optionalText,
  airmanship: optionalText,
  safetyConcerns: optionalText,
  focusNextLesson: optionalText,
  weatherConditions: optionalText,
});

export async function recordLesson(input: unknown): Promise<TrainingActionResult> {
  const actor = await requireStaff();
  if (!actor) return denied();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lesson record." };

  const supabase = await createServerSupabase();
  let syllabusId: string | null = null;
  if (parsed.data.lessonId) {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("id, syllabus_id, name")
      .eq("id", parsed.data.lessonId)
      .maybeSingle();
    if (error || !lesson) return { ok: false, error: "That lesson could not be found." };
    syllabusId = (lesson as { syllabus_id: string }).syllabus_id;
  }

  const { error } = await supabase.from("lesson_progress").insert({
    user_id: parsed.data.userId,
    syllabus_id: syllabusId,
    lesson_id: parsed.data.lessonId || null,
    lesson_title: parsed.data.lessonTitle,
    date: parsed.data.date,
    status: parsed.data.status,
    instructor_id: parsed.data.instructorId || null,
    instructor_comments: parsed.data.instructorComments,
    lesson_highlights: parsed.data.lessonHighlights,
    areas_for_improvement: parsed.data.areasForImprovement,
    airmanship: parsed.data.airmanship,
    safety_concerns: parsed.data.safetyConcerns,
    focus_next_lesson: parsed.data.focusNextLesson,
    weather_conditions: parsed.data.weatherConditions,
    record_source: "manual",
  });
  if (error) return { ok: false, error: "Could not save the lesson record." };
  refresh();
  revalidatePath(`/fly/instructor/training/${parsed.data.userId}`);
  return { ok: true };
}

const flightTestSchema = z.object({
  enrollmentId: z.string().uuid(),
  result: z.enum(["pass", "fail"]),
  testDate: dateKey,
  notes: optionalText,
});

export async function recordFlightTest(input: unknown): Promise<TrainingActionResult> {
  const actor = await requireStaff();
  if (!actor) return denied();
  const parsed = flightTestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid flight test." };

  const supabase = await createServerSupabase();
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_syllabus_enrollment")
    .select("id, user_id, syllabus_id")
    .eq("id", parsed.data.enrollmentId)
    .maybeSingle();
  if (enrollmentError || !enrollment) return { ok: false, error: "That enrolment could not be found." };

  const row = enrollment as { user_id: string; syllabus_id: string };
  const { error } = await supabase.from("syllabus_flight_tests").insert({
    enrollment_id: parsed.data.enrollmentId,
    user_id: row.user_id,
    syllabus_id: row.syllabus_id,
    result: parsed.data.result,
    test_date: parsed.data.testDate,
    notes: parsed.data.notes,
    recorded_by: actor.id,
  });
  if (error) return { ok: false, error: "Could not save the flight test." };
  refresh();
  return { ok: true };
}
