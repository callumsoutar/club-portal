import Link from "next/link";
import { notFound } from "next/navigation";

import { LogFlightButton } from "@/components/ccat/log-flight-dialog";
import { StudentButton } from "@/components/ccat/record-dialogs";
import {
  AuditList,
  CategoryLinks,
  FlightHistory,
  ProgressChart,
  StudentProgressSummary,
  SyllabusTable,
  categoryList,
} from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory, getLinkedProfiles } from "@/lib/ccat/queries";
import { activeEvents, buildFlightContext, visibleFlights } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";
import { Button } from "@/components/flight/ui/button";

export const metadata = { title: "Student training" };

export default async function StudentTrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireStaff();
  const [{ id }, { category }, directory, instructors, aircraft, company, profiles] = await Promise.all([
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
  const rows = progress.items.filter((row) => row.item.categoryKey === current && (row.item.isActive || row.status !== "not_started"));
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
  const events = activeEvents(directory.events, student.id);

  return (
    <Page width="wide">
      <PageHeader
        back={{ href: "/training", label: "C Cat Tracker" }}
        eyebrow={intake?.name ?? "No intake"}
        title={student.fullName}
        description={`${progress.status}. Started ${formatDate(student.startedOn ?? intake?.startsOn)}.`}
        actions={
          <>
            <LogFlightButton context={context} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/training/students/${student.id}/record`}>Print record</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/training/students/${student.id}/export`}>CSV</a>
            </Button>
            {user.profile.role === "admin" ? (
              <StudentButton intakes={directory.intakes} profiles={profiles} student={student} />
            ) : null}
          </>
        }
      />
      <StudentProgressSummary
        learnt={progress.flightLearntPct}
        taught={progress.flightTaughtPct}
        overall={progress.flightOverallPct}
        dual={progress.dualHours}
        solo={progress.soloHours}
      />
      <ProgressChart rows={progress.items} events={events} />
      <CategoryLinks categories={categories} current={current} baseHref={`/training/students/${student.id}`} />
      <SyllabusTable
        rows={rows}
        staff
        studentId={student.id}
        today={today}
        instructors={context.instructors}
        defaultInstructorId={context.defaultInstructorId}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Flights</h2>
        <FlightHistory flights={flights} staff context={context} />
      </section>
      <AuditList audits={directory.audits.filter((audit) => audit.detail.studentId === student.id || audit.entityId === student.id)} />
    </Page>
  );
}
