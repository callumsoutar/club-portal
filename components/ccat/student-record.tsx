import Link from "next/link";

import { EditFlightButton, RemoveFlightButton } from "@/components/ccat/log-flight-dialog";
import type { FlightFormContext } from "@/lib/ccat/present";
import type { ItemProgress, StudentProgress } from "@/lib/ccat/progress";
import type { CcatAudit, CcatFlight, CcatItem } from "@/lib/ccat/types";
import { formatDate } from "@/lib/flight/format";
import { Progress } from "@/components/flight/ui/progress";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  complete: "Complete",
  learnt: "Learnt",
  taught: "Taught",
  delivered: "Delivered",
  not_started: "Not started",
} as const;

const STATUS_CLASS = {
  complete: "bg-success-muted text-success",
  learnt: "bg-primary/10 text-primary",
  taught: "bg-warning-muted text-warning-foreground",
  delivered: "bg-primary/10 text-primary",
  not_started: "bg-muted text-muted-foreground",
} as const;

const CATEGORY_COPY: Record<string, { detail: string; empty: string }> = {
  flight: {
    detail: "A lesson is complete once the student has learnt it and taught it back.",
    empty: "Flight lessons will appear here once they are on the syllabus.",
  },
  pof: {
    detail: "Record each time a lecture is delivered. Mark it received once, with the instructor and date, when the student has had it.",
    empty: "POF lectures will appear here once they are on the syllabus.",
  },
  briefing: {
    detail: "Record each time a briefing is delivered. Mark it received once, with the instructor and date, when the student has had it.",
    empty: "Pre-flight briefings will appear here once they are on the syllabus.",
  },
  ground: {
    detail: "Sign off a ground topic when it has been covered.",
    empty: "Ground knowledge topics will appear here once they are on the syllabus.",
  },
};

export type SyllabusFocus = "all" | "open" | "done";

export function ProgressTracker({ progress }: { progress: StudentProgress }) {
  const areas = [
    { key: "flight", label: "Flight lessons" },
    { key: "pof", label: "POF lectures" },
    { key: "briefing", label: "Pre-flight briefings" },
    { key: "ground", label: "Ground knowledge" },
  ];
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Training progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Progress</h2>
        <p className="text-xs text-muted-foreground">
          {formatHours(progress.dualHours)} dual · {formatHours(progress.soloHours)} solo
          {progress.lastActivity ? ` · last ${formatDate(progress.lastActivity)}` : ""}
        </p>
      </div>
      <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((area) => {
          const stats = categoryStats(progress.items, area.key);
          return (
            <div key={area.key}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{area.label}</p>
                <p className="text-sm font-semibold tabular-nums">{stats.pct}%</p>
              </div>
              <Progress value={stats.pct} className="mt-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {stats.complete} of {stats.total} complete
                {area.key === "flight" ? ` · ${progress.flightLearntPct}% learnt · ${progress.flightTaughtPct}% taught` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StatusPill({
  status,
  className,
}: {
  status: StudentProgress["status"] | ItemProgress["status"];
  className?: string;
}) {
  const label = status in STATUS_LABEL ? STATUS_LABEL[status as ItemProgress["status"]] : status;
  const tone =
    status === "Complete" || status === "complete"
      ? STATUS_CLASS.complete
      : status === "Nearing completion" || status === "taught"
        ? STATUS_CLASS.taught
        : status === "In progress" || status === "learnt" || status === "delivered"
          ? STATUS_CLASS.learnt
          : STATUS_CLASS.not_started;
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", tone, className)}>
      {label}
    </span>
  );
}

export function categoryStats(rows: ItemProgress[], key: string) {
  const items = rows.filter((row) => row.item.categoryKey === key && row.item.isActive);
  const complete = items.filter((row) => row.status === "complete").length;
  const learnt = items.filter((row) => Boolean(row.learnt)).length;
  const taught = items.filter((row) => Boolean(row.taught)).length;
  return {
    total: items.length,
    complete,
    learnt,
    taught,
    mode: items[0]?.item.signoffMode ?? "single",
    pct: items.length ? Math.round((complete / items.length) * 100) : 0,
  };
}

export function CategoryLinks({
  categories,
  current,
  baseHref,
  rows,
  focus = "all",
}: {
  categories: { key: string; name: string }[];
  current: string;
  baseHref: string;
  rows: ItemProgress[];
  focus?: SyllabusFocus;
}) {
  return (
    <div className="-mb-px flex gap-6 overflow-x-auto border-b" role="tablist" aria-label="Syllabus">
      {categories.map((category) => {
        const active = category.key === current;
        const stats = categoryStats(rows, category.key);
        return (
          <Link
            key={category.key}
            href={categoryHref(baseHref, category.key, focus)}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 border-b-2 text-sm",
              active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {category.name}
            <span className={cn("text-xs tabular-nums", active ? "text-foreground/70" : "text-muted-foreground")}>
              {stats.complete}/{stats.total}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function FocusLinks({
  baseHref,
  category,
  focus,
  openCount,
  doneCount,
}: {
  baseHref: string;
  category: string;
  focus: SyllabusFocus;
  openCount: number;
  doneCount: number;
}) {
  const options: { key: SyllabusFocus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: `To do · ${openCount}` },
    { key: "done", label: `Done · ${doneCount}` },
  ];
  return (
    <div className="flex gap-1" role="group" aria-label="Filter this syllabus">
      {options.map((option) => (
        <Link
          key={option.key}
          href={categoryHref(baseHref, category, option.key)}
          className={cn(
            "inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium",
            focus === option.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
          aria-current={focus === option.key ? "true" : undefined}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function categoryHelp(key: string) {
  return CATEGORY_COPY[key]?.detail ?? "Sign off each item as the student completes it.";
}

export function syllabusEmpty(focus: SyllabusFocus, category: string) {
  if (focus === "open") return "Everything in this section is signed off.";
  if (focus === "done") return "Nothing is signed off yet.";
  return CATEGORY_COPY[category]?.empty ?? "Nothing in this section yet.";
}

export function syllabusSearchPlaceholder(category: string) {
  if (category === "flight") return "Search lessons";
  if (category === "pof") return "Search lectures";
  if (category === "briefing") return "Search briefings";
  return undefined;
}

export function FlightHistory({
  flights,
  staff,
  context,
}: {
  flights: CcatFlight[];
  staff: boolean;
  context: FlightFormContext | null;
}) {
  if (flights.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
        No flights recorded yet. Log a flight to attach the lessons learnt and taught on it.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Aircraft</th>
            <th className="px-3 py-2 font-medium">Instructor</th>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Learnt</th>
            <th className="px-3 py-2 font-medium">Taught</th>
            {staff && context ? <th className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={flight.id} className="border-b align-top last:border-0">
              <td className="px-3 py-1.5 whitespace-nowrap font-medium">{formatDate(flight.flownOn)}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{flight.aircraftRegistration || "—"}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{flight.instructorName || "—"}</td>
              <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                {formatHours(flight.dualHours)} dual · {formatHours(flight.soloHours)} solo
              </td>
              <td className="max-w-40 truncate px-3 py-1.5 text-muted-foreground" title={flight.learnt.join(", ")}>
                {flight.learnt.join(", ") || "—"}
              </td>
              <td className="max-w-40 truncate px-3 py-1.5 text-muted-foreground" title={flight.taught.join(", ")}>
                {flight.taught.join(", ") || "—"}
              </td>
              {staff && context ? (
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <div className="flex gap-1">
                    <EditFlightButton context={context} flight={flight} />
                    <RemoveFlightButton id={flight.id} />
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExerciseChips({ learnt, taught }: { learnt: string[]; taught: string[] }) {
  if (learnt.length === 0 && taught.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">No exercises recorded on this flight.</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {taught.map((name) => (
        <span key={`taught-${name}`} className="rounded-full bg-warning-muted px-2 py-0.5 text-xs text-warning-foreground">
          Taught · {name}
        </span>
      ))}
      {learnt.map((name) => (
        <span key={`learnt-${name}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          Learnt · {name}
        </span>
      ))}
    </div>
  );
}

export function AuditList({ audits }: { audits: CcatAudit[] }) {
  if (audits.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Recent changes</h2>
      <ul className="divide-y rounded-xl border bg-card">
        {audits.slice(0, 8).map((audit) => (
          <li key={audit.id} className="px-4 py-3 text-sm">
            <span className="font-medium capitalize">{audit.action}</span>
            <span className="text-muted-foreground"> {audit.entity} · {formatDate(audit.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function formatHours(value: number) {
  if (Number.isInteger(value)) return `${value}h`;
  return `${value.toFixed(2).replace(/0$/, "")}h`;
}

export function categoryList(items: CcatItem[]) {
  const seen = new Map<string, { key: string; name: string; sort: number }>();
  for (const item of items) {
    if (!seen.has(item.categoryKey)) {
      seen.set(item.categoryKey, { key: item.categoryKey, name: item.categoryName, sort: item.categorySort });
    }
  }
  return [...seen.values()].sort((a, b) => a.sort - b.sort);
}

export function categoryHref(baseHref: string, category: string, focus: SyllabusFocus = "all") {
  const params = new URLSearchParams({ category });
  if (focus !== "all") params.set("focus", focus);
  return `${baseHref}?${params.toString()}`;
}

export function parseFocus(value: string | undefined): SyllabusFocus {
  if (value === "open" || value === "done") return value;
  return "all";
}
