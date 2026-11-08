import Link from "next/link";

import { EditFlightButton, RemoveFlightButton } from "@/components/ccat/log-flight-dialog";
import { ExerciseChips, formatHours } from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { getCcatDirectory, progressFor } from "@/lib/ccat/queries";
import { buildFlightContext } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";

export const metadata = { title: "C Cat flight log" };

export default async function FlightLogPage() {
  const user = await requireStaff();
  const [directory, instructors, aircraft, company] = await Promise.all([
    getCcatDirectory(),
    getActiveInstructors(),
    getActiveAircraft(),
    getCompanySettings(),
  ]);
  const today = calendarDateInTimeZone(new Date(), company.timeZone);
  const progress = progressFor(directory);
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
  const flights = directory.flights
    .filter((flight) => !flight.voidedAt)
    .sort((a, b) => b.flownOn.localeCompare(a.flownOn) || b.id.localeCompare(a.id));

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="Flight log"
        description="C Cat training flights, newest first. Open a student to sign off lectures, briefings, or ground knowledge."
      />
      {flights.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No flights recorded yet.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {flights.map((flight) => {
            const student = directory.students.find((entry) => entry.id === flight.studentId);
            return (
              <li key={flight.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {student ? (
                      <Link href={`/training/students/${student.id}`} className="hover:underline">
                        {student.fullName}
                      </Link>
                    ) : (
                      "Student"
                    )}
                    <span className="font-normal text-muted-foreground"> · {formatDate(flight.flownOn)}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {flight.instructorName || "Instructor not recorded"}
                    {" · "}
                    {flight.aircraftRegistration || "No aircraft"}
                    {" · "}
                    {formatHours(flight.dualHours)} dual · {formatHours(flight.soloHours)} solo
                  </p>
                  <ExerciseChips learnt={flight.learnt} taught={flight.taught} />
                  {flight.notes ? <p className="mt-2 text-sm text-muted-foreground">{flight.notes}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <EditFlightButton context={context} flight={flight} />
                  <RemoveFlightButton id={flight.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
