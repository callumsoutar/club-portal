import Link from "next/link";

import { LogFlightButton } from "@/components/ccat/log-flight-dialog";
import { IntakeButton, StudentButton } from "@/components/ccat/record-dialogs";
import { Meter } from "@/components/ccat/student-record";
import { formatHours } from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { staleBefore } from "@/lib/ccat/progress";
import { getCcatDirectory, getLinkedProfiles, progressFor } from "@/lib/ccat/queries";
import { buildFlightContext } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";
import { cn } from "@/lib/utils";

export const metadata = { title: "C Cat Tracker" };

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ intake?: string }>;
}) {
  const user = await requireStaff();
  const [{ intake: intakeId }, directory, instructors, aircraft, company, profiles] = await Promise.all([
    searchParams,
    getCcatDirectory(),
    getActiveInstructors(),
    getActiveAircraft(),
    getCompanySettings(),
    user.profile.role === "admin" ? getLinkedProfiles() : Promise.resolve([]),
  ]);
  const today = calendarDateInTimeZone(new Date(), company.timeZone);
  const progress = progressFor(directory);
  const selected = directory.intakes.find((intake) => intake.id === intakeId) ?? null;
  const visible = progress.filter((row) => {
    if (row.student.status !== "active") return false;
    if (!selected) {
      const intake = directory.intakes.find((entry) => entry.id === row.student.intakeId);
      return !intake || intake.status === "active";
    }
    return row.student.intakeId === selected.id;
  });
  const context = buildFlightContext({
    intakes: directory.intakes,
    students: directory.students,
    items: directory.items,
    progress,
    instructors,
    aircraft,
    actorId: user.id,
    today,
  });
  const average = visible.length
    ? Math.round(visible.reduce((sum, row) => sum + row.flightOverallPct, 0) / visible.length)
    : 0;
  const quiet = visible.filter((row) => staleBefore(row.lastActivity, today));
  const activity = recentActivity(directory, progress);

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="C Cat Tracker"
        description="See how each instructor-rating student is progressing, then log what they learnt and taught."
        actions={
          <>
            <LogFlightButton context={context} />
            {user.profile.role === "admin" ? (
              <>
                <StudentButton intakes={directory.intakes} profiles={profiles} />
                <IntakeButton />
              </>
            ) : null}
          </>
        }
      />

      <div className="flex gap-2 overflow-x-auto">
        <IntakeChip href="/training" active={!selected} label="Active intakes" />
        {directory.intakes.map((intake) => (
          <IntakeChip
            key={intake.id}
            href={`/training?intake=${intake.id}`}
            active={selected?.id === intake.id}
            label={intake.status === "archived" ? `${intake.name} · archived` : intake.name}
          />
        ))}
      </div>

      {selected ? (
        <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
          <p className="text-sm"><span className="font-semibold tabular-nums">{visible.length}</span> students</p>
          <p className="text-sm"><span className="font-semibold tabular-nums">{average}%</span> of flight lessons complete</p>
          <p className="text-sm"><span className="font-semibold tabular-nums">{quiet.length}</span> with no activity in 14 days</p>
          {user.profile.role === "admin" ? <IntakeButton intake={selected} /> : null}
        </section>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No active students in this view. An admin can add a student or import the existing spreadsheet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <li key={row.student.id}>
              <Link href={`/training/students/${row.student.id}`} className="block rounded-xl border bg-card p-4 hover:bg-muted/30">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.student.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {directory.intakes.find((intake) => intake.id === row.student.intakeId)?.name ?? "No intake"}
                      {" · "}
                      {row.status}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatHours(row.dualHours)} dual · {formatHours(row.soloHours)} solo
                    {row.lastActivity ? ` · last ${formatDate(row.lastActivity)}` : " · no activity yet"}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Meter label="Flight" value={row.flightOverallPct} />
                  <Meter label="Learnt" value={row.flightLearntPct} />
                  <Meter label="Taught" value={row.flightTaughtPct} />
                  <Meter label="POF" value={row.pofPct} />
                  <Meter label="Briefings" value={row.briefingPct} />
                  <Meter label="Ground" value={row.groundPct} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Next to learn: {row.nextLearn ?? "Syllabus learnt"} · Next to teach: {row.nextTeach ?? "Nothing waiting"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Flights and sign-offs will show here. Chris Noldus and Joseph Peirce are enrolled with no historical sign-offs until the spreadsheet is imported.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {activity.map((entry) => (
              <li key={entry.id} className="px-3 py-3 text-sm">
                <span className="font-medium">{entry.who}</span>
                <span className="text-muted-foreground"> {entry.what} · {formatDate(entry.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function IntakeChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm",
        active ? "bg-muted font-medium" : "text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function recentActivity(
  directory: Awaited<ReturnType<typeof getCcatDirectory>>,
  progress: ReturnType<typeof progressFor>,
) {
  const name = new Map(progress.map((row) => [row.student.id, row.student.fullName]));
  const flights = directory.flights
    .filter((flight) => !flight.voidedAt)
    .map((flight) => ({
      id: `flight-${flight.id}`,
      date: flight.flownOn,
      who: name.get(flight.studentId) ?? "Student",
      what: `flew ${flight.aircraftRegistration ?? "a lesson"} with ${flight.instructorName ?? "an instructor"}`,
    }));
  const signoffs = directory.events
    .filter((event) => !event.voidedAt && !event.flightId)
    .map((event) => ({
      id: `event-${event.id}`,
      date: event.eventDate,
      who: name.get(event.studentId) ?? "Student",
      what: `${event.kind} ${directory.items.find((item) => item.id === event.itemId)?.name ?? "an exercise"}`,
    }));
  const people = directory.audits
    .filter((audit) => audit.entity === "student")
    .map((audit) => ({
      id: `audit-${audit.id}`,
      date: audit.createdAt.slice(0, 10),
      who: String(audit.detail.name ?? "A student"),
      what: audit.action === "create" ? "was added" : "was updated",
    }));
  return [...flights, ...signoffs, ...people].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
}
