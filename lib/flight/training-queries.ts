import "server-only";

import { cache } from "react";

import { hasRole, requireUser } from "@/lib/flight/auth";
import { createServerSupabase } from "@/lib/flight/supabase/server";
import { calendarDateInTimeZone } from "@/lib/time-zone";
import {
  buildTrainingDashboard,
  type LessonOutcome,
  type RosterStanding,
  rosterStanding,
  type TrainingDashboard,
  type TrainingEnrollment,
  type TrainingFlightTest,
  type TrainingLessonDefinition,
  type TrainingRecord,
} from "@/lib/flight/training";

type EnrollmentRow = {
  id: string;
  user_id: string;
  syllabus_id: string;
  status: string;
  enrolled_at: string;
  completion_date: string | null;
  unenrolled_at: string | null;
  primary_instructor_id: string | null;
  syllabus: { id: string; name: string; description: string | null; licence_type: string | null } | null;
  instructor: { id: string; full_name: string } | null;
};

type ProgressRow = {
  id: string;
  user_id: string;
  syllabus_id: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  date: string;
  attempt: number;
  status: LessonOutcome;
  instructor_comments: string | null;
  lesson_highlights: string | null;
  areas_for_improvement: string | null;
  airmanship: string | null;
  weather_conditions: string | null;
  safety_concerns: string | null;
  focus_next_lesson: string | null;
  authorisation_id: string | null;
  instructor: { full_name: string } | null;
};

function asOutcome(value: string): LessonOutcome {
  return value === "not yet competent" ? "not yet competent" : "pass";
}

export const getTrainingDashboardFor = cache(async (studentId: string): Promise<TrainingDashboard | null> => {
  const session = await requireUser();
  const staff = hasRole(session.profile.role, "instructor");
  if (studentId !== session.id && !staff) return null;

  const supabase = await createServerSupabase();
  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("student_syllabus_enrollment")
    .select(
      "id, user_id, syllabus_id, status, enrolled_at, completion_date, unenrolled_at, primary_instructor_id, syllabus:syllabus_id (id, name, description, licence_type), instructor:primary_instructor_id (id, full_name)",
    )
    .eq("user_id", studentId)
    .order("enrolled_at", { ascending: false });

  if (enrollmentError) throw enrollmentError;

  const enrollmentsRaw = (enrollmentRows ?? []) as unknown as EnrollmentRow[];
  const syllabusIds = [...new Set(enrollmentsRaw.map((row) => row.syllabus_id))];
  const enrollmentIds = enrollmentsRaw.map((row) => row.id);

  const [lessonsResult, progressResult, testsResult, nameResult] = await Promise.all([
    syllabusIds.length
      ? supabase
          .from("lessons")
          .select("id, syllabus_id, name, sort_order, is_active, is_required")
          .in("syllabus_id", syllabusIds)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("lesson_progress")
      .select(
        "id, user_id, syllabus_id, lesson_id, lesson_title, date, attempt, status, instructor_comments, lesson_highlights, areas_for_improvement, airmanship, weather_conditions, safety_concerns, focus_next_lesson, authorisation_id, instructor:instructor_id (full_name)",
      )
      .eq("user_id", studentId)
      .order("date", { ascending: false }),
    enrollmentIds.length
      ? supabase
          .from("syllabus_flight_tests")
          .select("id, enrollment_id, result, test_date, notes")
          .eq("user_id", studentId)
          .in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [], error: null }),
    studentId === session.id
      ? Promise.resolve({ data: [{ user_id: session.id, full_name: session.profile.full_name, email: session.email }], error: null })
      : supabase.rpc("training_roster_names"),
  ]);

  if (lessonsResult.error) throw lessonsResult.error;
  if (progressResult.error) throw progressResult.error;
  if (testsResult.error) throw testsResult.error;

  const lessons: TrainingLessonDefinition[] = ((lessonsResult.data ?? []) as Array<{
    id: string;
    syllabus_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    is_required: boolean;
  }>).map((lesson) => ({
    id: lesson.id,
    syllabusId: lesson.syllabus_id,
    name: lesson.name,
    sortOrder: lesson.sort_order,
    isActive: lesson.is_active,
    isRequired: lesson.is_required,
  }));

  const records: TrainingRecord[] = ((progressResult.data ?? []) as unknown as ProgressRow[]).map((row) => ({
    id: row.id,
    syllabusId: row.syllabus_id,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    date: row.date,
    attempt: row.attempt,
    status: asOutcome(row.status),
    instructorName: row.instructor?.full_name ?? null,
    instructorComments: row.instructor_comments,
    lessonHighlights: row.lesson_highlights,
    areasForImprovement: row.areas_for_improvement,
    airmanship: row.airmanship,
    weatherConditions: row.weather_conditions,
    safetyConcerns: row.safety_concerns,
    focusNextLesson: row.focus_next_lesson,
    authorisationId: row.authorisation_id,
  }));

  const flightTests: TrainingFlightTest[] = ((testsResult.data ?? []) as Array<{
    id: string;
    enrollment_id: string;
    result: string;
    test_date: string;
    notes: string | null;
  }>).map((row) => ({
    id: row.id,
    enrollmentId: row.enrollment_id,
    result: row.result === "fail" ? "fail" : "pass",
    testDate: row.test_date,
    notes: row.notes,
  }));

  const enrollments: TrainingEnrollment[] = enrollmentsRaw.map((row) => ({
    id: row.id,
    syllabusId: row.syllabus_id,
    syllabusName: row.syllabus?.name?.trim() || "Syllabus",
    syllabusDescription: row.syllabus?.description ?? null,
    licenceType: row.syllabus?.licence_type ?? null,
    status: row.status,
    enrolledAt: row.enrolled_at,
    completionDate: row.completion_date,
    unenrolledAt: row.unenrolled_at,
    instructorName: row.instructor?.full_name ?? null,
  }));

  const names = (nameResult.data ?? []) as Array<{ user_id: string; full_name: string | null; email: string | null }>;
  const named = names.find((row) => row.user_id === studentId);
  const studentName = named?.full_name?.trim() || named?.email || "Student";

  return buildTrainingDashboard({
    studentName,
    enrollments,
    lessons,
    records,
    flightTests,
  });
});

export type TrainingRosterRow = {
  enrollmentId: string;
  userId: string;
  studentName: string;
  email: string | null;
  syllabusName: string;
  standing: RosterStanding;
  percent: number | null;
  completed: number;
  total: number;
  enrolledOn: string;
  lastTrainingOn: string | null;
  stageLabel: string;
};

export type TrainingCatalog = {
  syllabi: Array<{
    id: string;
    name: string;
    description: string | null;
    licenceType: string | null;
    lessons: Array<{ id: string; name: string; sortOrder: number; isRequired: boolean }>;
  }>;
};

export async function getTrainingCatalog(): Promise<TrainingCatalog> {
  const session = await requireUser();
  if (!hasRole(session.profile.role, "admin")) return { syllabi: [] };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("syllabus")
    .select("id, name, description, licence_type, lessons (id, name, sort_order, is_required, is_active)")
    .order("name");
  if (error) throw error;
  const syllabi = ((data ?? []) as unknown as Array<{
    id: string;
    name: string;
    description: string | null;
    licence_type: string | null;
    lessons: Array<{ id: string; name: string; sort_order: number; is_required: boolean; is_active: boolean }> | null;
  }>).map((syllabus) => ({
    id: syllabus.id,
    name: syllabus.name,
    description: syllabus.description,
    licenceType: syllabus.licence_type,
    lessons: (syllabus.lessons ?? [])
      .filter((lesson) => lesson.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((lesson) => ({
        id: lesson.id,
        name: lesson.name,
        sortOrder: lesson.sort_order,
        isRequired: lesson.is_required,
      })),
  }));
  return { syllabi };
}

export async function getTrainingRoster(timeZone: string): Promise<TrainingRosterRow[]> {
  const session = await requireUser();
  if (!hasRole(session.profile.role, "instructor")) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("student_syllabus_enrollment")
    .select("id, user_id, status, enrolled_at, completion_date, unenrolled_at, syllabus_id, syllabus:syllabus_id (name)")
    .order("enrolled_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    status: string;
    enrolled_at: string;
    completion_date: string | null;
    unenrolled_at: string | null;
    syllabus_id: string;
    syllabus: { name: string } | null;
  }>;

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [dashboards, nameResult] = await Promise.all([
    Promise.all(userIds.map((userId) => getTrainingDashboardFor(userId))),
    supabase.rpc("training_roster_names"),
  ]);
  if (nameResult.error) throw nameResult.error;
  const byUser = new Map(userIds.map((userId, index) => [userId, dashboards[index]]));
  const emailByUser = new Map(
    ((nameResult.data ?? []) as Array<{ user_id: string; email: string | null }>).map((row) => [row.user_id, row.email]),
  );
  const today = calendarDateInTimeZone(new Date(), timeZone);
  const asCalendarDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : calendarDateInTimeZone(new Date(value), timeZone);

  return rows
    .map((row) => {
      const dashboard = byUser.get(row.user_id);
      const enrollment = dashboard?.enrollments.find((item) => item.id === row.id);
      const enrolledOn = asCalendarDate(row.enrolled_at);
      const lastTrainingOn = enrollment?.lastTrainingDate ? asCalendarDate(enrollment.lastTrainingDate) : null;
      const status = enrollment?.status ?? row.status;
      return {
        enrollmentId: row.id,
        userId: row.user_id,
        studentName: dashboard?.studentName ?? "Student",
        email: emailByUser.get(row.user_id) ?? null,
        syllabusName: row.syllabus?.name ?? enrollment?.syllabusName ?? "Syllabus",
        standing: rosterStanding({ status, enrolledOn, lastTrainingOn, today }),
        percent: enrollment?.progress.percent ?? null,
        completed: enrollment?.progress.completed ?? 0,
        total: enrollment?.progress.total ?? 0,
        enrolledOn,
        lastTrainingOn,
        stageLabel: enrollment?.stageLabel ?? "Not started",
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.syllabusName.localeCompare(b.syllabusName));
}
