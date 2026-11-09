import { notFound } from "next/navigation";

import { LogFlightButton } from "@/components/ccat/log-flight-dialog";
import { RecordMenu } from "@/components/ccat/record-menu";
import { StudentButton } from "@/components/ccat/record-dialogs";
import { Avatar, AvatarFallback } from "@/components/flight/ui/avatar";
import {
  AuditList,
  CategoryLinks,
  FlightHistory,
  FocusLinks,
  ProgressTracker,
  StatusPill,
  categoryHelp,
  categoryList,
  parseFocus,
  syllabusEmpty,
  syllabusSearchPlaceholder,
} from "@/components/ccat/student-record";
import { SyllabusTable } from "@/components/ccat/syllabus-table";
import { Page, PageHeader } from "@/components/portal/page";
import { staleBefore, studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory, getLinkedProfiles } from "@/lib/ccat/queries";
import { buildFlightContext, visibleFlights } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate, initials } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Student training" };

export default async function StudentTrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; focus?: string }>;
}) {
  const user = await requireStaff();
  const [{ id }, { category, focus: focusParam }, directory, instructors, aircraft, company, profiles] = await Promise.all([
    params,
    searchParams,
    getCcatDirectory(),
    getActiveInstructors(),
    getActiveAircraft(),
    getCompanySettings(),
    user.profile.role === "admin" ? getLinkedProfiles() : Promise.resolve([]),
  ]);
  const student = directory.students.find((entry) => entry.id === id);
  if (!student) notFound();
  const today = calendarDateInTimeZone(new Date(), company.timeZone);
  const progress = studentProgress(student, directory.items, directory.events, directory.flights);
  const categories = categoryList(directory.items);
  const current = categories.some((entry) => entry.key === category) ? category! : categories[0]?.key ?? "flight";
  const focus = parseFocus(focusParam);
  const inCategory = progress.items.filter((row) => row.item.categoryKey === current && (row.item.isActive || row.status !== "not_started"));
  const rows = inCategory.filter((row) => {
    if (focus === "open") return row.status !== "complete";
    if (focus === "done") return row.status === "complete";
    return true;
  });
  const intake = directory.intakes.find((entry) => entry.id === student.intakeId);
  const context = buildFlightContext({
    intakes: directory.intakes,
    students: directory.students,
    items: directory.items,
    progress: [progress],
    instructors,
    aircraft,
    actorId: user.id,
    today,
  });
  const flights = visibleFlights(directory.flights, student.id);
  const stale = staleBefore(progress.lastActivity, today);

  return (
    <Page width="wide">
      <PageHeader
        back={{ href: "/training", label: "C Cat Tracker" }}
        leading={
          <Avatar className="size-14" aria-hidden>
            <AvatarFallback className="bg-sidebar text-base font-semibold tracking-tight text-white">
              {initials(student.fullName)}
            </AvatarFallback>
          </Avatar>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            {student.fullName}
            <StatusPill status={progress.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <span className="font-medium text-foreground">{intake?.name ?? "No intake"}</span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="whitespace-nowrap">Started {formatDate(student.startedOn ?? intake?.startsOn)}</span>
            {stale ? (
              <span className="font-medium whitespace-nowrap text-warning-foreground">No activity in 14 days</span>
            ) : null}
          </span>
        }
        actions={
          <>
            <LogFlightButton context={context} />
            {user.profile.role === "admin" ? (
              <StudentButton intakes={directory.intakes} profiles={profiles} student={student} />
            ) : null}
            <RecordMenu studentId={student.id} />
          </>
        }
      />
      <ProgressTracker progress={progress} />
      <div className="flex flex-col gap-3">
        <CategoryLinks
          categories={categories}
          current={current}
          baseHref={`/training/students/${student.id}`}
          rows={progress.items}
          focus={focus}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {categoryHelp(current)}
            {current === "flight" ? (
              <>
                {" "}
                Next to learn <span className="font-medium text-foreground">{progress.nextLearn ?? "the syllabus"}</span>
                {" · "}
                next to teach <span className="font-medium text-foreground">{progress.nextTeach ?? "nothing"}</span>.
              </>
            ) : null}
          </p>
          <FocusLinks
            baseHref={`/training/students/${student.id}`}
            category={current}
            focus={focus}
            openCount={inCategory.filter((row) => row.status !== "complete").length}
            doneCount={inCategory.filter((row) => row.status === "complete").length}
          />
        </div>
        <SyllabusTable
          rows={rows}
          staff
          studentId={student.id}
          today={today}
          instructors={context.instructors}
          defaultInstructorId={context.defaultInstructorId}
          empty={syllabusEmpty(focus, current)}
          searchPlaceholder={syllabusSearchPlaceholder(current)}
        />
      </div>
      {current === "flight" ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Flights</h2>
          <FlightHistory flights={flights} staff context={context} />
        </section>
      ) : null}
      <AuditList audits={directory.audits.filter((audit) => audit.detail.studentId === student.id || audit.entityId === student.id)} />
    </Page>
  );
}
