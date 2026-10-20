import { calendarDaysBetween } from "@/lib/time-zone";

export type LessonOutcome = "pass" | "not yet competent";
export type LessonCompetency = "competent" | "not_yet_competent" | "not_started";

export type TrainingLessonDefinition = {
  id: string;
  syllabusId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isRequired: boolean;
};

export type TrainingRecord = {
  id: string;
  syllabusId: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  date: string;
  attempt: number;
  status: LessonOutcome;
  instructorName: string | null;
  instructorComments: string | null;
  lessonHighlights: string | null;
  areasForImprovement: string | null;
  airmanship: string | null;
  weatherConditions: string | null;
  safetyConcerns: string | null;
  focusNextLesson: string | null;
  authorisationId: string | null;
};

export type TrainingEnrollment = {
  id: string;
  syllabusId: string;
  syllabusName: string;
  syllabusDescription: string | null;
  licenceType: string | null;
  status: string;
  enrolledAt: string;
  completionDate: string | null;
  unenrolledAt: string | null;
  instructorName: string | null;
};

export type TrainingFlightTest = {
  id: string;
  enrollmentId: string;
  result: "pass" | "fail";
  testDate: string;
  notes: string | null;
};

export type SyllabusLessonRow = {
  lessonId: string;
  order: number;
  title: string;
  optional: boolean;
  competency: LessonCompetency;
  latestOutcome: LessonOutcome | null;
  latestDate: string | null;
  attemptCount: number;
  recordIds: string[];
};

export type TrainingHistoryRecord = TrainingRecord & {
  title: string;
  placement: "syllabus" | "additional";
  syllabusName: string | null;
  siblingRecordIds: string[];
};

export type TrainingEnrollmentView = TrainingEnrollment & {
  progress: { completed: number; remaining: number; total: number; percent: number | null };
  lastTrainingDate: string | null;
  stageLabel: string;
  lessons: SyllabusLessonRow[];
  flightTests: TrainingFlightTest[];
};

export type TrainingDashboard = {
  studentName: string;
  enrollments: TrainingEnrollmentView[];
  history: TrainingHistoryRecord[];
};

export function outcomeLabel(status: LessonOutcome | null): string {
  if (status === "pass") return "Competent";
  if (status === "not yet competent") return "Not yet competent";
  return "Not started";
}

export function competencyLabel(competency: LessonCompetency): string {
  if (competency === "competent") return "Competent";
  if (competency === "not_yet_competent") return "Not yet competent";
  return "Not started";
}

export function recordTitle(record: Pick<TrainingRecord, "lessonTitle">, lessonName?: string | null): string {
  const stored = record.lessonTitle?.trim();
  if (stored) return stored;
  const canonical = lessonName?.trim();
  if (canonical) return canonical;
  return "Training record";
}

function dateMs(value: string): number {
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  return parsed.getTime();
}

function compareAttemptsDesc(a: { date: string; attempt: number }, b: { date: string; attempt: number }) {
  const diff = dateMs(b.date) - dateMs(a.date);
  if (Number.isFinite(diff) && diff !== 0) return diff;
  return b.attempt - a.attempt;
}

export function recordBelongsToSyllabus(
  record: Pick<TrainingRecord, "lessonId" | "syllabusId">,
  syllabusId: string,
  lessonIds: ReadonlySet<string>,
): boolean {
  if (!record.lessonId || !lessonIds.has(record.lessonId)) return false;
  if (record.syllabusId && record.syllabusId !== syllabusId) return false;
  return true;
}

export type RosterStanding = "active" | "new" | "at_risk" | "stale" | "graduated" | "withdrawn";

/** How an enrolment should read on the instructor roster. Quiet means days since the last lesson. */
export function rosterStanding(input: {
  status: string;
  enrolledOn: string;
  lastTrainingOn: string | null;
  today: string;
}): RosterStanding {
  const status = input.status.trim().toLowerCase();
  if (status === "graduated" || status === "completed") return "graduated";
  if (status === "withdrawn") return "withdrawn";
  const enrolledDays = calendarDaysBetween(input.enrolledOn, input.today);
  if (!input.lastTrainingOn) {
    if (enrolledDays >= 90) return "stale";
    if (enrolledDays >= 30) return "at_risk";
    return "new";
  }
  const quietDays = calendarDaysBetween(input.lastTrainingOn, input.today);
  if (quietDays >= 90) return "stale";
  if (quietDays >= 30) return "at_risk";
  return "active";
}

function enrollmentStatusLabel(enrollment: TrainingEnrollment): string {
  const status = enrollment.status.trim().toLowerCase();
  if (status === "withdrawn" || enrollment.unenrolledAt) return "Withdrawn";
  if (status === "completed" || enrollment.completionDate) return "Graduated";
  if (status === "active") return "Active";
  return enrollment.status || "Enrolled";
}

export function buildTrainingDashboard(input: {
  studentName: string;
  enrollments: TrainingEnrollment[];
  lessons: TrainingLessonDefinition[];
  records: TrainingRecord[];
  flightTests: TrainingFlightTest[];
}): TrainingDashboard {
  const lessonsBySyllabus = new Map<string, TrainingLessonDefinition[]>();
  for (const lesson of input.lessons) {
    const list = lessonsBySyllabus.get(lesson.syllabusId) ?? [];
    list.push(lesson);
    lessonsBySyllabus.set(lesson.syllabusId, list);
  }
  for (const list of lessonsBySyllabus.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const lessonById = new Map(input.lessons.map((lesson) => [lesson.id, lesson]));
  const syllabusNameById = new Map(input.enrollments.map((enrollment) => [enrollment.syllabusId, enrollment.syllabusName]));
  const enrolledSyllabi = input.enrollments.map((enrollment) => ({
    syllabusId: enrollment.syllabusId,
    lessonIds: new Set(
      (lessonsBySyllabus.get(enrollment.syllabusId) ?? [])
        .filter((lesson) => lesson.isActive)
        .map((lesson) => lesson.id),
    ),
  }));

  const recordsByLesson = new Map<string, TrainingRecord[]>();
  for (const record of input.records) {
    if (!record.lessonId) continue;
    const list = recordsByLesson.get(record.lessonId) ?? [];
    list.push(record);
    recordsByLesson.set(record.lessonId, list);
  }
  for (const list of recordsByLesson.values()) list.sort(compareAttemptsDesc);

  const enrollments = [...input.enrollments]
    .sort((a, b) => {
      const rank = (enrollment: TrainingEnrollment) => {
        const status = enrollment.status.trim().toLowerCase();
        if (status === "active" && !enrollment.completionDate && !enrollment.unenrolledAt) return 0;
        if (status === "completed" || enrollment.completionDate) return 1;
        return 2;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return dateMs(b.enrolledAt) - dateMs(a.enrolledAt);
    })
    .map((enrollment) => {
      const activeLessons = (lessonsBySyllabus.get(enrollment.syllabusId) ?? []).filter((lesson) => lesson.isActive);
      const required = activeLessons.filter((lesson) => lesson.isRequired);
      const lessonIds = new Set(activeLessons.map((lesson) => lesson.id));
      const requiredIds = new Set(required.map((lesson) => lesson.id));
      const passed = new Set<string>();
      let lastDate: string | null = null;
      let lastMs = Number.NEGATIVE_INFINITY;

      for (const record of input.records) {
        if (!recordBelongsToSyllabus(record, enrollment.syllabusId, lessonIds)) continue;
        const ms = dateMs(record.date);
        if (Number.isFinite(ms) && ms > lastMs) {
          lastMs = ms;
          lastDate = record.date;
        }
        if (record.status === "pass" && record.lessonId && requiredIds.has(record.lessonId)) {
          passed.add(record.lessonId);
        }
      }

      const total = required.length;
      const completed = passed.size;
      const next = required.find((lesson) => !passed.has(lesson.id)) ?? null;

      return {
        ...enrollment,
        status: enrollmentStatusLabel(enrollment),
        progress: {
          completed,
          remaining: Math.max(0, total - completed),
          total,
          percent: total > 0 ? Math.round((completed / total) * 100) : null,
        },
        lastTrainingDate: lastDate,
        stageLabel: !required.length ? "No required lessons" : next ? `Next: ${next.name}` : "Syllabus complete",
        lessons: activeLessons.map((lesson) => {
          const attempts = (recordsByLesson.get(lesson.id) ?? []).filter((record) =>
            recordBelongsToSyllabus(record, enrollment.syllabusId, lessonIds),
          );
          const latest = attempts[0] ?? null;
          const hasPass = attempts.some((record) => record.status === "pass");
          const competency: LessonCompetency = hasPass
            ? "competent"
            : latest?.status === "not yet competent"
              ? "not_yet_competent"
              : "not_started";
          return {
            lessonId: lesson.id,
            order: lesson.sortOrder,
            title: lesson.name,
            optional: !lesson.isRequired,
            competency,
            latestOutcome: latest?.status ?? null,
            latestDate: latest?.date ?? null,
            attemptCount: attempts.length,
            recordIds: attempts.map((record) => record.id),
          };
        }),
        flightTests: input.flightTests
          .filter((test) => test.enrollmentId === enrollment.id)
          .sort((a, b) => dateMs(b.testDate) - dateMs(a.testDate)),
      };
    });

  const history = [...input.records].sort(compareAttemptsDesc).map((record) => {
    const lesson = record.lessonId ? lessonById.get(record.lessonId) ?? null : null;
    const siblings = record.lessonId ? recordsByLesson.get(record.lessonId) ?? [record] : [record];
    const placement: "syllabus" | "additional" = enrolledSyllabi.some((syllabus) =>
      recordBelongsToSyllabus(record, syllabus.syllabusId, syllabus.lessonIds),
    )
      ? "syllabus"
      : "additional";
    return {
      ...record,
      title: recordTitle(record, lesson?.name),
      placement,
      syllabusName: (record.syllabusId ? syllabusNameById.get(record.syllabusId) : null) ?? (lesson ? syllabusNameById.get(lesson.syllabusId) ?? null : null),
      siblingRecordIds: siblings.map((sibling) => sibling.id),
    };
  });

  return { studentName: input.studentName, enrollments, history };
}
