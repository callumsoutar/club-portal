import type { StudentProgress } from "@/lib/ccat/progress";
import type { CcatEvent, CcatFlight, CcatIntake, CcatItem, CcatStudent } from "@/lib/ccat/types";
import type { Instructor } from "@/lib/flight/types";

export interface FlightFormContext {
  students: { id: string; name: string; intake: string | null }[];
  instructors: { id: string; name: string }[];
  aircraft: { id: string; registration: string }[];
  items: { id: string; name: string; sortOrder: number }[];
  suggestions: Record<string, { learn: string[]; teach: string[] }>;
  defaultInstructorId: string;
  today: string;
}

export function buildFlightContext(input: {
  intakes: CcatIntake[];
  students: CcatStudent[];
  items: CcatItem[];
  progress: StudentProgress[];
  instructors: Instructor[];
  aircraft: { id: string; registration: string }[];
  actorId: string;
  today: string;
}): FlightFormContext {
  const flightItems = input.items
    .filter((item) => item.categoryKey === "flight" && item.isActive && item.signoffMode === "learnt_taught")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const suggestions: FlightFormContext["suggestions"] = {};
  for (const row of input.progress) {
    const ordered = row.items
      .filter((item) => item.item.categoryKey === "flight" && item.item.isActive)
      .sort((a, b) => a.item.sortOrder - b.item.sortOrder);
    suggestions[row.student.id] = {
      learn: ordered.filter((item) => !item.learnt).map((item) => item.item.id),
      teach: ordered.filter((item) => item.learnt && !item.taught).map((item) => item.item.id),
    };
  }
  return {
    students: input.students
      .filter((student) => student.status === "active")
      .map((student) => ({
        id: student.id,
        name: student.fullName,
        intake: input.intakes.find((intake) => intake.id === student.intakeId)?.name ?? null,
      })),
    instructors: input.instructors.map((instructor) => ({ id: instructor.id, name: instructor.full_name })),
    aircraft: input.aircraft,
    items: flightItems.map((item) => ({ id: item.id, name: item.name, sortOrder: item.sortOrder })),
    suggestions,
    defaultInstructorId: input.instructors.find((instructor) => instructor.profile_id === input.actorId)?.id ?? "",
    today: input.today,
  };
}

export function mondayOnOrBefore(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function itemName(items: CcatItem[], id: string) {
  return items.find((item) => item.id === id)?.name ?? "Exercise";
}

export function activeEvents(events: CcatEvent[], studentId?: string) {
  return events.filter((event) => !event.voidedAt && (!studentId || event.studentId === studentId));
}

export function visibleFlights(flights: CcatFlight[], studentId?: string) {
  return flights.filter((flight) => !flight.voidedAt && (!studentId || flight.studentId === studentId));
}
