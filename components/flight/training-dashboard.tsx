"use client";

import { useMemo, useState } from "react";
import { BookOpen, Calendar, Check, ChevronRight, Plane, Search, UserRound } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/flight/ui/sheet";
import { cn } from "@/lib/flight/utils";
import { formatDate } from "@/lib/flight/format";
import {
  outcomeLabel,
  type LessonCompetency,
  type TrainingDashboard,
  type TrainingEnrollmentView,
  type TrainingHistoryRecord,
} from "@/lib/flight/training";
import { calendarDaysBetween } from "@/lib/time-zone";

type SyllabusFilter = "all" | LessonCompetency;
type Panel = "overview" | "flying" | "debriefs" | "theory" | "syllabus";

function when(value: string | null | undefined, timeZone: string) {
  if (!value) return "—";
  return formatDate(value, "d MMM yyyy", timeZone);
}

function lessonCode(order: number) {
  return String(order).padStart(2, "0");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "—";
}

function ago(days: number) {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function Mark({ competency }: { competency: LessonCompetency }) {
  if (competency === "competent") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (competency === "not_yet_competent") {
    return <span className="size-5 rounded-full border-2 border-amber-500 bg-amber-500/15" aria-hidden />;
  }
  return <span className="size-5 rounded-full border-2 border-border bg-background" aria-hidden />;
}

function OutcomeBadge({ competency }: { competency: LessonCompetency | "additional" }) {
  const styles = {
    competent: "border-emerald-600/20 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
    not_yet_competent: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    not_started: "border-border bg-muted text-muted-foreground",
    additional: "border-sky-600/20 bg-sky-600/10 text-sky-800 dark:text-sky-300",
  } as const;
  const label =
    competency === "additional"
      ? "Additional"
      : competency === "competent"
        ? "Competent"
        : competency === "not_yet_competent"
          ? "Not yet competent"
          : "Upcoming";
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium", styles[competency])}>
      {label}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Note({ label, value, tone }: { label: string; value: string | null; tone: "good" | "watch" | "plain" }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <section
      className={cn(
        "rounded-xl px-3.5 py-3",
        tone === "good" && "bg-emerald-600/10",
        tone === "watch" && "bg-amber-500/10",
        tone === "plain" && "bg-muted/60",
      )}
    >
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </section>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl border bg-card p-4", className)}>{children}</section>;
}

function hasDebrief(record: TrainingHistoryRecord) {
  return [
    record.lessonHighlights,
    record.areasForImprovement,
    record.instructorComments,
    record.airmanship,
    record.safetyConcerns,
    record.focusNextLesson,
    record.weatherConditions,
  ].some((value) => value?.trim());
}

const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  graduated: "bg-violet-600/10 text-violet-800 dark:text-violet-300",
  withdrawn: "bg-muted text-muted-foreground",
};

export function TrainingDashboardView({
  data,
  timeZone,
  today,
  onRecordLesson,
  onRecordFlightTest,
}: {
  data: TrainingDashboard;
  timeZone: string;
  today: string;
  onRecordLesson?: (lessonId: string | null) => void;
  onRecordFlightTest?: () => void;
}) {
  const [enrollmentId, setEnrollmentId] = useState(data.enrollments[0]?.id ?? "");
  const [panel, setPanel] = useState<Panel>("overview");
  const [syllabusFilter, setSyllabusFilter] = useState<SyllabusFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const enrollment = data.enrollments.find((item) => item.id === enrollmentId) ?? data.enrollments[0] ?? null;
  const records = useMemo(() => new Map(data.history.map((record) => [record.id, record])), [data.history]);
  const open = openId ? records.get(openId) ?? null : null;
  const siblings: TrainingHistoryRecord[] = open
    ? open.siblingRecordIds.map((id) => records.get(id)).filter((record): record is TrainingHistoryRecord => Boolean(record))
    : [];

  const lessonRecords = enrollment
    ? data.history.filter((record) => record.syllabusName === enrollment.syllabusName || record.placement === "additional")
    : data.history;
  const debriefs = lessonRecords.filter(hasDebrief);
  const required = enrollment?.lessons.filter((lesson) => !lesson.optional) ?? [];
  const next = required.find((lesson) => lesson.competency !== "competent") ?? null;
  const percent = enrollment?.progress.percent ?? null;
  const statusKey = enrollment?.status.trim().toLowerCase() ?? "";
  const lastDays = enrollment?.lastTrainingDate ? calendarDaysBetween(enrollment.lastTrainingDate.slice(0, 10), today) : null;

  const needle = query.trim().toLowerCase();
  const lessons = (enrollment?.lessons ?? []).filter((lesson) => {
    if (syllabusFilter !== "all" && lesson.competency !== syllabusFilter) return false;
    if (!needle) return true;
    return `${lessonCode(lesson.order)} ${lesson.title}`.toLowerCase().includes(needle);
  });

  const activity = [
    ...lessonRecords.slice(0, 6).map((record) => ({
      id: record.id,
      date: record.date,
      title: record.status === "pass" ? "Lesson complete" : "Not yet competent",
      detail: record.title,
      recordId: record.id,
    })),
    ...(enrollment
      ? [{
          id: `enrolled-${enrollment.id}`,
          date: enrollment.enrolledAt,
          title: "Enrolled in training",
          detail: `${enrollment.syllabusName} · ${enrollment.status}`,
          recordId: undefined as string | undefined,
        }]
      : []),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const tabs: Array<{ id: Panel; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "flying", label: "Flying" },
    { id: "debriefs", label: "Debriefs" },
    { id: "theory", label: "Theory" },
    { id: "syllabus", label: "Syllabus" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {initials(data.studentName)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{data.studentName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {enrollment ? (
                data.enrollments.length > 1 ? (
                  <label>
                    <span className="sr-only">Syllabus</span>
                    <select
                      className="h-8 max-w-full rounded-lg border bg-card px-2 text-sm"
                      value={enrollment.id}
                      onChange={(event) => setEnrollmentId(event.target.value)}
                    >
                      {data.enrollments.map((item) => (
                        <option key={item.id} value={item.id}>{item.syllabusName}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="text-sm text-muted-foreground">{enrollment.syllabusName}</span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">No syllabus enrolment</span>
              )}
              {enrollment ? (
                <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold tracking-wide uppercase", STATUS_CLASS[statusKey] ?? "bg-muted text-muted-foreground")}>
                  {enrollment.status}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRecordLesson ? <Button type="button" onClick={() => onRecordLesson(null)}>Record lesson</Button> : null}
          {onRecordFlightTest ? <Button type="button" variant="outline" onClick={onRecordFlightTest}>Record flight test</Button> : null}
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Student training">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={panel === tab.id}
            onClick={() => setPanel(tab.id)}
            className={cn(
              "h-10 shrink-0 border-b-2 px-3 text-sm font-medium",
              panel === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel === "overview" ? (
        <Overview
          enrollment={enrollment}
          enrollments={data.enrollments}
          timeZone={timeZone}
          lastDays={lastDays}
          nextTitle={next?.title ?? null}
          percent={percent}
          activity={activity}
          onOpenRecord={setOpenId}
          onSelectEnrollment={setEnrollmentId}
        />
      ) : null}

      {panel === "flying" ? (
        lessonRecords.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No lesson records yet.</p>
        ) : (
          <RecordList records={lessonRecords} timeZone={timeZone} onOpen={setOpenId} />
        )
      ) : null}

      {panel === "debriefs" ? (
        debriefs.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No debrief notes on these lesson records yet.</p>
        ) : (
          <RecordList records={debriefs} timeZone={timeZone} onOpen={setOpenId} />
        )
      ) : null}

      {panel === "theory" ? (
        <Card>
          <p className="text-sm font-medium">Theory exams</p>
          <p className="mt-1 text-sm text-muted-foreground">No exams are configured for this club.</p>
        </Card>
      ) : null}

      {panel === "syllabus" ? (
        <SyllabusPanel
          lessons={lessons}
          timeZone={timeZone}
          filter={syllabusFilter}
          query={query}
          onFilter={setSyllabusFilter}
          onQuery={setQuery}
          onRecord={(lessonId) => onRecordLesson?.(lessonId)}
          onOpenRecord={setOpenId}
          canRecord={Boolean(onRecordLesson)}
        />
      ) : null}

      <Sheet open={Boolean(open)} onOpenChange={(nextOpen) => !nextOpen && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open ? (
            <>
              <SheetHeader className="pr-8">
                <p className="text-xs text-muted-foreground">
                  {[open.syllabusName, open.placement === "additional" ? "Additional training" : null].filter(Boolean).join(" · ")}
                </p>
                <SheetTitle className="text-xl">{open.title}</SheetTitle>
                <SheetDescription className="sr-only">Instructor feedback for this lesson.</SheetDescription>
                <OutcomeBadge competency={open.status === "pass" ? "competent" : "not_yet_competent"} />
              </SheetHeader>
              <div className="flex flex-col gap-5 px-4 pb-8">
                {siblings.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Attempts">
                    {siblings.map((sibling) => (
                      <button
                        key={sibling.id}
                        type="button"
                        aria-pressed={sibling.id === open.id}
                        onClick={() => setOpenId(sibling.id)}
                        className={cn(
                          "h-8 rounded-full border px-3 text-xs font-medium",
                          sibling.id === open.id ? "border-foreground bg-foreground text-background" : "text-muted-foreground",
                        )}
                      >
                        Attempt {sibling.attempt} · {when(sibling.date, timeZone)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <dl className="grid grid-cols-2 gap-2">
                  <Stat label="Date" value={when(open.date, timeZone)} />
                  <Stat label="Attempt" value={String(open.attempt)} />
                  <Stat label="Instructor" value={open.instructorName ?? "Not recorded"} />
                  <Stat label="Outcome" value={outcomeLabel(open.status)} />
                </dl>
                <Note label="What went well" value={open.lessonHighlights} tone="good" />
                <Note label="Areas for improvement" value={open.areasForImprovement} tone="watch" />
                <Note label="Instructor comments" value={open.instructorComments} tone="plain" />
                <Note label="Airmanship" value={open.airmanship} tone="plain" />
                <Note label="Safety" value={open.safetyConcerns} tone="watch" />
                <Note label="Focus for next lesson" value={open.focusNextLesson} tone="plain" />
                <Note label="Weather" value={open.weatherConditions} tone="plain" />
                {onRecordLesson && open.lessonId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const lessonId = open.lessonId;
                      if (!lessonId) return;
                      setOpenId(null);
                      onRecordLesson(lessonId);
                    }}
                  >
                    Record another attempt
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Overview({
  enrollment,
  enrollments,
  timeZone,
  lastDays,
  nextTitle,
  percent,
  activity,
  onOpenRecord,
  onSelectEnrollment,
}: {
  enrollment: TrainingEnrollmentView | null;
  enrollments: TrainingEnrollmentView[];
  timeZone: string;
  lastDays: number | null;
  nextTitle: string | null;
  percent: number | null;
  activity: Array<{ id: string; date: string; title: string; detail: string; recordId?: string }>;
  onOpenRecord: (id: string) => void;
  onSelectEnrollment: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Calendar className="size-3.5" aria-hidden /> Last flight</p>
            <p className="mt-2 text-lg font-semibold">{enrollment?.lastTrainingDate ? when(enrollment.lastTrainingDate, timeZone) : "Never"}</p>
            <p className="text-xs text-muted-foreground">{lastDays == null ? "No lesson recorded" : ago(lastDays)}</p>
          </Card>
          <Card>
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Plane className="size-3.5" aria-hidden /> Flight progress</p>
            <p className="mt-2 text-lg font-semibold">
              {enrollment ? `${enrollment.progress.completed} of ${enrollment.progress.total} lessons` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{percent == null ? "No required lessons" : `${percent}% complete`}</p>
          </Card>
          <Card>
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BookOpen className="size-3.5" aria-hidden /> Theory exams</p>
            <p className="mt-2 text-lg font-semibold">—</p>
            <p className="text-xs text-muted-foreground">No exams configured</p>
          </Card>
        </div>

        <Card>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Up next</p>
          <p className="mt-2 text-lg font-semibold">{nextTitle ?? (enrollment ? "Syllabus complete" : "No syllabus")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextTitle ? "The next required lesson that is not yet competent." : "Nothing further is required on this syllabus."}
          </p>
        </Card>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Training progress</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-xs font-medium text-muted-foreground">Flight lessons</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{percent == null ? "—" : `${percent}%`}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent ?? 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {enrollment ? `${enrollment.progress.completed} completed · ${enrollment.progress.remaining} remaining` : "No enrolment"}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-muted-foreground">Theory exams</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden />
              <p className="mt-2 text-xs text-muted-foreground">0 passed · 0 total</p>
            </Card>
          </div>
        </div>

        {enrollments.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Enrolled syllabus</p>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {enrollments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectEnrollment(item.id)}
                  className={cn("flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/40", item.id === enrollment?.id && "bg-muted/30")}
                >
                  <span>
                    <span className="block text-sm font-medium">{item.syllabusName}</span>
                    <span className="text-xs text-muted-foreground">{item.syllabusDescription || "Training syllabus"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Enrolled {when(item.enrolledAt, timeZone)} · {item.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Instructor</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {enrollment?.instructorName ? initials(enrollment.instructorName) : <UserRound className="size-4" aria-hidden />}
            </span>
            <span>
              <span className="block text-sm font-medium">{enrollment?.instructorName ?? "Not assigned"}</span>
              <span className="text-xs text-muted-foreground">Flight instructor</span>
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Key dates</p>
          <dl className="mt-3 divide-y text-sm">
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Enrolled</dt>
              <dd className="font-medium">{enrollment ? when(enrollment.enrolledAt, timeZone) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Last flight</dt>
              <dd className="font-medium">{enrollment?.lastTrainingDate ? when(enrollment.lastTrainingDate, timeZone) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Next lesson</dt>
              <dd className="max-w-[10rem] truncate text-right font-medium">{nextTitle ?? "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Activity</p>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.recordId ? (
                    <button type="button" onClick={() => onOpenRecord(item.recordId!)} className="text-left hover:underline">
                      <ActivityItem item={item} timeZone={timeZone} />
                    </button>
                  ) : (
                    <ActivityItem item={item} timeZone={timeZone} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({
  item,
  timeZone,
}: {
  item: { date: string; title: string; detail: string };
  timeZone: string;
}) {
  return (
    <span className="block">
      <span className="text-xs text-muted-foreground">{when(item.date, timeZone)}</span>
      <span className="block text-sm font-medium">{item.title}</span>
      <span className="block text-xs text-muted-foreground">{item.detail}</span>
    </span>
  );
}

function RecordList({
  records,
  timeZone,
  onOpen,
}: {
  records: TrainingHistoryRecord[];
  timeZone: string;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {records.map((record) => (
        <li key={record.id}>
          <button type="button" onClick={() => onOpen(record.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{record.title}</span>
              <span className="text-xs text-muted-foreground">
                {when(record.date, timeZone)}
                {record.instructorName ? ` · ${record.instructorName}` : ""}
                {` · Attempt ${record.attempt}`}
              </span>
            </span>
            <OutcomeBadge competency={record.status === "pass" ? "competent" : record.placement === "additional" ? "additional" : "not_yet_competent"} />
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SyllabusPanel({
  lessons,
  timeZone,
  filter,
  query,
  onFilter,
  onQuery,
  onRecord,
  onOpenRecord,
  canRecord,
}: {
  lessons: TrainingEnrollmentView["lessons"];
  timeZone: string;
  filter: SyllabusFilter;
  query: string;
  onFilter: (filter: SyllabusFilter) => void;
  onQuery: (query: string) => void;
  onRecord: (lessonId: string) => void;
  onOpenRecord: (id: string) => void;
  canRecord: boolean;
}) {
  const filters: Array<[SyllabusFilter, string]> = [
    ["all", "All"],
    ["competent", "Competent"],
    ["not_yet_competent", "Not yet competent"],
    ["not_started", "Upcoming"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter lessons">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium",
                filter === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search lessons" aria-label="Search lessons" className="bg-card pl-9" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Select a lesson to record it. The name can be changed before you save.</p>
      {lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No lessons match this view.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="w-10 px-4 py-2 font-medium"><span className="sr-only">Status</span></th>
                  <th className="w-14 px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Lesson</th>
                  <th className="w-28 px-2 py-2 font-medium">Latest</th>
                  <th className="w-20 px-2 py-2 font-medium">Attempts</th>
                  <th className="w-40 px-2 py-2 font-medium">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.lessonId} className="border-b last:border-b-0">
                    <td className="px-4 py-3"><Mark competency={lesson.competency} /></td>
                    <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{lessonCode(lesson.order)}</td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        disabled={!canRecord}
                        onClick={() => onRecord(lesson.lessonId)}
                        className="text-left font-medium enabled:hover:underline"
                      >
                        {lesson.title}
                      </button>
                      {lesson.optional ? <span className="mt-0.5 block text-xs text-muted-foreground">Optional</span> : null}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">{lesson.latestDate ? when(lesson.latestDate, timeZone) : "—"}</td>
                    <td className="px-2 py-3">
                      {lesson.recordIds[0] ? (
                        <button type="button" onClick={() => onOpenRecord(lesson.recordIds[0])} className="tabular-nums hover:underline">
                          {lesson.attemptCount}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3"><OutcomeBadge competency={lesson.competency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
