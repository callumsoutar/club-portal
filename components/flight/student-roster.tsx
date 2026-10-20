"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";

import { Input } from "@/components/flight/ui/input";
import { cn } from "@/lib/flight/utils";
import { formatDate } from "@/lib/flight/format";
import type { TrainingRosterRow } from "@/lib/flight/training-queries";
import type { RosterStanding } from "@/lib/flight/training";
import { calendarDaysBetween } from "@/lib/time-zone";

const CURRENT: RosterStanding[] = ["active", "new", "at_risk", "stale"];

type RosterView = "enrolled" | RosterStanding;

const STANDING_LABEL: Record<RosterStanding, string> = {
  active: "Active",
  new: "New",
  at_risk: "At risk",
  stale: "Stale",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

const STANDING_CLASS: Record<RosterStanding, string> = {
  active: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  new: "bg-sky-600/10 text-sky-800 dark:text-sky-300",
  at_risk: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  stale: "bg-muted text-muted-foreground",
  graduated: "bg-violet-600/10 text-violet-800 dark:text-violet-300",
  withdrawn: "bg-muted text-muted-foreground",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "—";
}

function ago(days: number) {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function sinceEnrolled(days: number) {
  if (days <= 0) return "Enrolled today";
  if (days === 1) return "1 day since enrolled";
  return `${days} days since enrolled`;
}

function isCurrent(standing: RosterStanding) {
  return CURRENT.includes(standing);
}

function matchesView(standing: RosterStanding, view: RosterView) {
  if (view === "enrolled") return isCurrent(standing);
  return standing === view;
}

function preferredSyllabus(rows: TrainingRosterRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!isCurrent(row.standing)) continue;
    counts.set(row.syllabusName, (counts.get(row.syllabusName) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked[0]?.[0] ?? rows[0]?.syllabusName ?? "";
}

export function StudentRoster({
  rows,
  timeZone,
  today,
}: {
  rows: TrainingRosterRow[];
  timeZone: string;
  today: string;
}) {
  const [syllabus, setSyllabus] = useState(() => preferredSyllabus(rows));
  const [view, setView] = useState<RosterView>("enrolled");
  const [query, setQuery] = useState("");

  const syllabi = useMemo(() => {
    const names = [...new Set(rows.map((row) => row.syllabusName))];
    return names
      .map((name) => ({
        name,
        enrolled: rows.filter((row) => row.syllabusName === name && isCurrent(row.standing)).length,
      }))
      .sort((a, b) => b.enrolled - a.enrolled || a.name.localeCompare(b.name));
  }, [rows]);

  const inSyllabus = rows.filter((row) => row.syllabusName === syllabus);
  const counts = useMemo(() => {
    const tally: Record<RosterStanding, number> = {
      active: 0,
      new: 0,
      at_risk: 0,
      stale: 0,
      graduated: 0,
      withdrawn: 0,
    };
    for (const row of inSyllabus) tally[row.standing] += 1;
    return tally;
  }, [inSyllabus]);
  const enrolledCount = CURRENT.reduce((sum, standing) => sum + counts[standing], 0);

  const visible = inSyllabus
    .filter((row) => matchesView(row.standing, view))
    .filter((row) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return `${row.studentName} ${row.email ?? ""}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const enrolledFilters: Array<{ id: RosterView; label: string; count: number; title?: string }> = [
    { id: "enrolled", label: "Enrolled", count: enrolledCount },
    { id: "at_risk", label: "At risk", count: counts.at_risk, title: "No lesson in the last 30 days" },
    { id: "active", label: "Active", count: counts.active, title: "A lesson in the last 30 days" },
    { id: "new", label: "New", count: counts.new, title: "Enrolled in the last 30 days, with no lessons yet" },
    { id: "stale", label: "Stale", count: counts.stale, title: "No lesson in the last 90 days" },
  ].filter(
    (filter): filter is { id: RosterView; label: string; count: number; title?: string } =>
      filter.id === "enrolled" || filter.count > 0 || view === filter.id,
  );
  const archiveFilters: Array<{ id: RosterView; label: string; count: number }> = [
    ...(counts.graduated ? [{ id: "graduated" as const, label: "Graduated", count: counts.graduated }] : []),
    ...(counts.withdrawn ? [{ id: "withdrawn" as const, label: "Withdrawn", count: counts.withdrawn }] : []),
  ];

  const empty =
    view === "graduated"
      ? "No one has graduated from this syllabus."
      : view === "withdrawn"
        ? "No one has withdrawn from this syllabus."
        : query.trim()
          ? "No students match this search."
          : "No one is enrolled in this syllabus.";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Syllabus">
        {syllabi.map((item) => {
          const selected = syllabus === item.name;
          return (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSyllabus(item.name)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.name}
              <span className={cn("tabular-nums", selected ? "text-background/80" : "text-muted-foreground")}>
                {item.enrolled}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Who is enrolled">
          {enrolledFilters.map((filter) => (
            <FilterTab
              key={filter.id}
              label={filter.label}
              count={filter.count}
              title={filter.title}
              selected={view === filter.id}
              onClick={() => setView(filter.id)}
            />
          ))}
        </div>
        {archiveFilters.length > 0 ? (
          <div className="flex gap-1 pb-1" role="tablist" aria-label="Past enrolments">
            {archiveFilters.map((filter) => {
              const selected = view === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setView(filter.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm",
                    selected ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                  <span className="tabular-nums">{filter.count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {visible.length === 1 ? "1 student" : `${visible.length} students`}
          <span className="text-muted-foreground/80"> · {syllabus}</span>
        </p>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this syllabus"
            aria-label="Search this syllabus"
            className="bg-card pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[18%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-3 py-2.5 font-medium">Enrolled</th>
                  <th className="px-3 py-2.5 font-medium">Last flew</th>
                  <th className="px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-8 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <StudentRow key={row.enrollmentId} row={row} timeZone={timeZone} today={today} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  count,
  title,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  title?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium",
        selected ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 text-xs tabular-nums", selected ? "bg-foreground text-background" : "bg-muted")}>
        {count}
      </span>
    </button>
  );
}

function StudentRow({
  row,
  timeZone,
  today,
}: {
  row: TrainingRosterRow;
  timeZone: string;
  today: string;
}) {
  const router = useRouter();
  const quiet = row.lastTrainingOn ? calendarDaysBetween(row.lastTrainingOn, today) : null;
  const enrolledDays = calendarDaysBetween(row.enrolledOn, today);
  return (
    <tr
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/30"
      onClick={() => router.push(`/fly/instructor/training/${row.userId}`)}
    >
      <td className="px-4 py-3">
        <Link href={`/fly/instructor/training/${row.userId}`} className="flex min-w-0 items-center gap-3" onClick={(event) => event.stopPropagation()}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
            {initials(row.studentName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.studentName}</span>
            {row.email ? <span className="block truncate text-xs text-muted-foreground">{row.email}</span> : null}
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{formatDate(row.enrolledOn, "d MMM yyyy", timeZone)}</td>
      <td className="px-3 py-3">
        {row.lastTrainingOn ? (
          <>
            <span className="block font-medium">{formatDate(row.lastTrainingOn, "d MMM yyyy", timeZone)}</span>
            <span className="text-xs text-muted-foreground">{ago(quiet ?? 0)}</span>
          </>
        ) : (
          <>
            <span className="block font-medium">Never</span>
            <span className="text-xs text-muted-foreground">{sinceEnrolled(enrolledDays)}</span>
          </>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="w-full min-w-28 max-w-40">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span>{row.completed} / {row.total} lessons</span>
            <span className="tabular-nums text-muted-foreground">{row.percent == null ? "—" : `${row.percent}%`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${row.percent ?? 0}%` }} />
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={cn("inline-flex h-6 max-w-full items-center truncate rounded-full px-2 text-[11px] font-semibold uppercase", STANDING_CLASS[row.standing])}>
          {STANDING_LABEL[row.standing]}
        </span>
      </td>
      <td className="px-3 py-3">
        <Link href={`/fly/instructor/training/${row.userId}`} aria-label={`Open ${row.studentName}`} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
