import Link from "next/link";

import { ClearSignoffButton, SignoffButton } from "@/components/ccat/record-dialogs";
import { EditFlightButton, RemoveFlightButton } from "@/components/ccat/log-flight-dialog";
import type { FlightFormContext } from "@/lib/ccat/present";
import { progressSeries } from "@/lib/ccat/progress";
import type { ItemProgress } from "@/lib/ccat/progress";
import type { CcatAudit, CcatEvent, CcatFlight, CcatItem } from "@/lib/ccat/types";
import { formatDate } from "@/lib/flight/format";
import { Progress } from "@/components/flight/ui/progress";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  complete: "Complete",
  learnt: "Learnt",
  taught: "Taught",
  not_started: "Not started",
} as const;

export function StudentProgressSummary({
  learnt,
  taught,
  overall,
  dual,
  solo,
}: {
  learnt: number;
  taught: number;
  overall: number;
  dual: number;
  solo: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Meter label="Flight learnt" value={learnt} />
      <Meter label="Flight taught" value={taught} />
      <Meter label="Flight complete" value={overall} />
      <p className="text-sm text-muted-foreground sm:col-span-3">
        {formatHours(dual)} dual · {formatHours(solo)} solo
      </p>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function SyllabusTable({
  rows,
  staff,
  studentId,
  today,
  instructors,
  defaultInstructorId,
}: {
  rows: ItemProgress[];
  staff: boolean;
  studentId: string;
  today: string;
  instructors: { id: string; name: string }[];
  defaultInstructorId: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Nothing in this category yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-[13px] text-foreground/80">
          <tr>
            <th className="px-3 py-3 font-semibold">Exercise</th>
            <th className="px-3 py-3 font-semibold">Learnt</th>
            <th className="hidden px-3 py-3 font-semibold sm:table-cell">Taught</th>
            <th className="px-3 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const single = row.item.signoffMode === "single";
            return (
              <tr key={row.item.id} className="border-b align-top last:border-0">
                <td className="px-3 py-3 font-medium">{row.item.name}</td>
                <td className="px-3 py-3">
                  {single ? (
                    <Stamp
                      stamp={row.completed}
                      staff={staff}
                      empty={
                        <SignoffButton
                          studentId={studentId}
                          itemId={row.item.id}
                          itemName={row.item.name}
                          kind="completed"
                          today={today}
                          instructors={instructors}
                          defaultInstructorId={defaultInstructorId}
                          label="Sign off"
                        />
                      }
                    />
                  ) : (
                    <Stamp
                      stamp={row.learnt}
                      staff={staff}
                      empty={
                        staff ? (
                          <SignoffButton
                            studentId={studentId}
                            itemId={row.item.id}
                            itemName={row.item.name}
                            kind="learnt"
                            today={today}
                            instructors={instructors}
                            defaultInstructorId={defaultInstructorId}
                            label="Record"
                          />
                        ) : (
                          "—"
                        )
                      }
                    />
                  )}
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  {single ? (
                    "—"
                  ) : (
                    <Stamp
                      stamp={row.taught}
                      staff={staff}
                      empty={
                        staff ? (
                          <SignoffButton
                            studentId={studentId}
                            itemId={row.item.id}
                            itemName={row.item.name}
                            kind="taught"
                            today={today}
                            instructors={instructors}
                            defaultInstructorId={defaultInstructorId}
                            label="Record"
                          />
                        ) : (
                          "—"
                        )
                      }
                    />
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={cn("text-sm", row.status === "complete" ? "text-foreground" : "text-muted-foreground")}>
                    {STATUS_LABEL[row.status]}
                  </span>
                  {!single ? (
                    <div className="mt-1 space-y-1 sm:hidden">
                      <p className="text-xs text-muted-foreground">Taught</p>
                      <Stamp
                        stamp={row.taught}
                        staff={staff}
                        empty={
                          staff ? (
                            <SignoffButton
                              studentId={studentId}
                              itemId={row.item.id}
                              itemName={row.item.name}
                              kind="taught"
                              today={today}
                              instructors={instructors}
                              defaultInstructorId={defaultInstructorId}
                              label="Record taught"
                            />
                          ) : (
                            "—"
                          )
                        }
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stamp({
  stamp,
  staff,
  empty,
}: {
  stamp: ItemProgress["learnt"];
  staff: boolean;
  empty: React.ReactNode;
}) {
  if (!stamp) return staff ? empty : <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <p>{formatDate(stamp.date)}</p>
      <p className="text-xs text-muted-foreground">{stamp.instructorName || "Instructor not recorded"}</p>
      {staff ? <ClearSignoffButton id={stamp.eventId} /> : null}
    </div>
  );
}

export function ProgressChart({ rows, events }: { rows: ItemProgress[]; events: CcatEvent[] }) {
  const series = progressSeries(rows, events);
  const total = rows.filter((row) => row.item.categoryKey === "flight" && row.item.isActive).length;
  if (series.length === 0) {
    return <p className="text-sm text-muted-foreground">Sign-offs will draw the progress chart.</p>;
  }
  const width = 320;
  const height = 96;
  const line = (key: "learnt" | "taught") =>
    series
      .map((point, index) => {
        const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width;
        const y = height - (point[key] / Math.max(total, 1)) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" role="img" aria-label="Flight exercises learnt and taught over time">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={line("learnt")} className="text-primary" />
        <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" points={line("taught")} className="text-muted-foreground" />
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Solid · learnt</span>
        <span>Dashed · taught</span>
        <span>{total} flight exercises</span>
      </figcaption>
    </figure>
  );
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
    return <p className="text-sm text-muted-foreground">No flights recorded.</p>;
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {flights.map((flight) => (
        <li key={flight.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {formatDate(flight.flownOn)}
              {flight.aircraftRegistration ? ` · ${flight.aircraftRegistration}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {flight.instructorName || "Instructor not recorded"} · {formatHours(flight.dualHours)} dual · {formatHours(flight.soloHours)} solo
            </p>
            <p className="mt-1 text-sm">
              Taught: {flight.taught.join(", ") || "—"}
            </p>
            <p className="text-sm">
              Learnt: {flight.learnt.join(", ") || "—"}
            </p>
            {flight.notes ? <p className="mt-1 text-sm text-muted-foreground">{flight.notes}</p> : null}
          </div>
          {staff && context ? (
            <div className="flex gap-2">
              <EditFlightButton context={context} flight={flight} />
              <RemoveFlightButton id={flight.id} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AuditList({ audits }: { audits: CcatAudit[] }) {
  if (audits.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Recent changes</h2>
      <ul className="divide-y rounded-xl border bg-card">
        {audits.map((audit) => (
          <li key={audit.id} className="px-3 py-3 text-sm">
            <span className="font-medium capitalize">{audit.action}</span>
            <span className="text-muted-foreground"> {audit.entity} · {formatDate(audit.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryLinks({
  categories,
  current,
  baseHref,
}: {
  categories: { key: string; name: string }[];
  current: string;
  baseHref: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Syllabus categories">
      {categories.map((category) => {
        const active = category.key === current;
        return (
          <Link
            key={category.key}
            href={`${baseHref}?category=${category.key}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm",
              active ? "bg-muted font-medium" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
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
