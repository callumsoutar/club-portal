import { FlightLog } from "@/components/ccat/flight-log";
import { formatHours } from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { getCcatDirectory, progressFor } from "@/lib/ccat/queries";
import { buildFlightContext } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { formatDate } from "@/lib/flight/format";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
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
  const entries = directory.flights
    .filter((flight) => !flight.voidedAt)
    .sort((a, b) => b.flownOn.localeCompare(a.flownOn) || b.id.localeCompare(a.id))
    .map((flight) => {
      const student = directory.students.find((entry) => entry.id === flight.studentId);
      return {
        flight,
        studentName: student?.fullName ?? "Student",
        studentHref: student ? `/training/students/${student.id}` : null,
        dateLabel: formatDate(flight.flownOn),
        aircraft: flight.aircraftRegistration || "—",
        instructor: flight.instructorName || "—",
        dual: flight.dualHours > 0 ? formatHours(flight.dualHours) : "—",
        solo: flight.soloHours > 0 ? formatHours(flight.soloHours) : "—",
      };
    });

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="C Cat"
        title="Flight log"
        description="Training flights, newest first. Search by student, aircraft, or exercise."
      />
      <FlightLog entries={entries} context={context} />
    </Page>
  );
}
