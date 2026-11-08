import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/flight/ui/avatar";
import { Button } from "@/components/flight/ui/button";

import { LogFlightButton } from "@/components/ccat/log-flight-dialog";
import { IntakeButton, StudentButton } from "@/components/ccat/record-dialogs";
import { StatusPill, categoryStats, formatHours } from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { Progress } from "@/components/flight/ui/progress";
import { staleBefore } from "@/lib/ccat/progress";
import { getCcatDirectory, getLinkedProfiles, progressFor } from "@/lib/ccat/queries";
import { buildFlightContext } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate, initials } from "@/lib/flight/format";
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
  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="C Cat Tracker"
        description="Pick a student to record flight lessons, POF lectures, briefings, and ground knowledge. Log a flight when the work happened in the air."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/training/questions">POF questions</Link>
            </Button>
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

      <div className="flex items-center gap-2 overflow-x-auto">
        <IntakeChip href="/training" active={!selected} label="Active intakes" count={progress.filter((row) => row.student.status === "active" && activeIntake(directory, row.student.intakeId)).length} />
        {directory.intakes.map((intake) => (
          <IntakeChip
            key={intake.id}
            href={`/training?intake=${intake.id}`}
            active={selected?.id === intake.id}
            label={intake.status === "archived" ? `${intake.name} · archived` : intake.name}
            count={progress.filter((row) => row.student.status === "active" && row.student.intakeId === intake.id).length}
          />
        ))}
      </div>

      {selected && user.profile.role === "admin" ? (
        <div className="flex justify-end">
          <IntakeButton intake={selected} />
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No active students in this view. An admin can add a student to this intake.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {[...visible].sort((a, b) => a.student.fullName.localeCompare(b.student.fullName)).map((row) => {
            const intakeName = directory.intakes.find((intake) => intake.id === row.student.intakeId)?.name ?? "No intake";
            const quietStudent = staleBefore(row.lastActivity, today);
            const areas = [
              { key: "flight", label: "Flight lessons", value: row.flightOverallPct },
              { key: "pof", label: "POF lectures", value: row.pofPct },
              { key: "briefing", label: "Pre-flight briefings", value: row.briefingPct },
              { key: "ground", label: "Ground knowledge", value: row.groundPct },
            ];
            return (
              <li key={row.student.id} className="min-w-0">
                <Link
                  href={`/training/students/${row.student.id}`}
                  className={cn(
                    "group flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/15 hover:bg-muted/30",
                    quietStudent && "border-warning/40",
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-sidebar text-sm font-semibold text-white">
                        {initials(row.student.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-base font-semibold tracking-tight group-hover:underline">
                          {row.student.fullName}
                        </p>
                        <ChevronRight
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                          aria-hidden
                        />
                      </div>
                      <div className="mt-1.5">
                        <StatusPill status={row.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium">{intakeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatHours(row.dualHours)} dual · {formatHours(row.soloHours)} solo
                    </p>
                    <p className={cn("text-xs text-muted-foreground", quietStudent && "font-medium text-warning-foreground")}>
                      {quietStudent
                        ? "No activity in 14 days"
                        : row.lastActivity
                          ? `Last activity ${formatDate(row.lastActivity)}`
                          : "No activity yet"}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 border-t pt-4">
                    {areas.map((area) => {
                      const stats = categoryStats(row.items, area.key);
                      return (
                        <div key={area.key}>
                          <div className="flex items-baseline justify-between gap-3 text-xs">
                            <span className="font-medium text-foreground">{area.label}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {stats.complete}/{stats.total}
                            </span>
                          </div>
                          <Progress value={area.value} className="mt-1.5" />
                        </div>
                      );
                    })}
                  </div>

                </Link>
              </li>
            );
          })}
        </ul>
      )}

    </Page>
  );
}

function IntakeChip({ href, label, active, count }: { href: string; label: string; active: boolean; count: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm",
        active ? "border-foreground bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>{count}</span>
    </Link>
  );
}

function activeIntake(
  directory: Awaited<ReturnType<typeof getCcatDirectory>>,
  intakeId: string | null,
) {
  const intake = directory.intakes.find((entry) => entry.id === intakeId);
  return !intake || intake.status === "active";
}

