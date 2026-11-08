import { EditFlightButton, RemoveFlightButton } from "@/components/ccat/log-flight-dialog";
import { Page, PageHeader } from "@/components/portal/page";
import { formatHours } from "@/components/ccat/student-record";
import { getCcatDirectory, progressFor } from "@/lib/ccat/queries";
import { buildFlightContext } from "@/lib/ccat/present";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";

export const metadata = { title: "C Cat flight log" };

export default async function FlightLogPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; intake?: string; instructor?: string; aircraft?: string; from?: string; to?: string; q?: string }>;
}) {
  const user = await requireStaff();
  const [query, directory, instructors, aircraft, company] = await Promise.all([
    searchParams,
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
  const term = query.q?.trim().toLowerCase() ?? "";
  const flights = directory.flights.filter((flight) => {
    if (flight.voidedAt) return false;
    if (query.student && flight.studentId !== query.student) return false;
    if (query.instructor && flight.instructorId !== query.instructor) return false;
    if (query.aircraft && !(flight.aircraftRegistration ?? "").toLowerCase().includes(query.aircraft.toLowerCase())) return false;
    if (query.from && flight.flownOn < query.from) return false;
    if (query.to && flight.flownOn > query.to) return false;
    if (query.intake) {
      const student = directory.students.find((entry) => entry.id === flight.studentId);
      if (student?.intakeId !== query.intake) return false;
    }
    if (!term) return true;
    const student = directory.students.find((entry) => entry.id === flight.studentId)?.fullName ?? "";
    const haystack = [student, flight.instructorName, flight.aircraftRegistration, flight.notes, ...flight.learnt, ...flight.taught]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="Flight log"
        description="Every C Cat training flight, with the exercises learnt and taught on it."
      />
      <form className="grid gap-3 sm:grid-cols-3" action="/training/flights">
        <Field label="Student" name="student" defaultValue={query.student ?? ""} options={directory.students.map((student) => ({ value: student.id, label: student.fullName }))} />
        <Field label="Intake" name="intake" defaultValue={query.intake ?? ""} options={directory.intakes.map((intake) => ({ value: intake.id, label: intake.name }))} />
        <Field label="Instructor" name="instructor" defaultValue={query.instructor ?? ""} options={instructors.map((instructor) => ({ value: instructor.id, label: instructor.full_name }))} />
        <div className="space-y-2">
          <Label htmlFor="aircraft">Aircraft</Label>
          <Input id="aircraft" name="aircraft" defaultValue={query.aircraft ?? ""} placeholder="ZK-" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={query.from ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={query.to ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={query.q ?? ""} placeholder="Name, exercise, notes" />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline">Filter</Button>
        </div>
      </form>
      {flights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flights match.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {flights.map((flight) => {
            const student = directory.students.find((entry) => entry.id === flight.studentId);
            const intake = directory.intakes.find((entry) => entry.id === student?.intakeId);
            return (
              <li key={flight.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{student?.fullName ?? "Student"} · {formatDate(flight.flownOn)}</p>
                  <p className="text-sm text-muted-foreground">
                    {intake?.name ?? "No intake"} · {flight.instructorName || "Instructor not recorded"} · {flight.aircraftRegistration || "No aircraft"} · {formatHours(flight.dualHours)} dual · {formatHours(flight.soloHours)} solo
                  </p>
                  <p className="mt-1 text-sm">Taught: {flight.taught.join(", ") || "—"}</p>
                  <p className="text-sm">Learnt: {flight.learnt.join(", ") || "—"}</p>
                </div>
                <div className="flex gap-2">
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

function Field({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue} className="h-10 w-full rounded-lg border bg-background px-3 text-sm sm:h-9">
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
