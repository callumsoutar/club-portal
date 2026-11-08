import { NextResponse } from "next/server";

import { studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { visibleFlights } from "@/lib/ccat/present";
import { hasRole, requireUser } from "@/lib/flight/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const directory = await getCcatDirectory();
  const student = directory.students.find((entry) => entry.id === id);
  if (!student || (!hasRole(user.profile.role, "instructor") && student.profileId !== user.id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const progress = studentProgress(student, directory.items, directory.events, directory.flights);
  const intake = directory.intakes.find((entry) => entry.id === student.intakeId)?.name ?? "";
  const lines = [
    ["Student", student.fullName],
    ["Intake", intake],
    ["Status", progress.status],
    ["Dual hours", String(progress.dualHours)],
    ["Solo hours", String(progress.soloHours)],
    [],
    ["Category", "Exercise", "Learnt", "Learnt instructor", "Taught", "Taught instructor", "Completed", "Completed instructor"],
    ...progress.items.map((row) => [
      row.item.categoryName,
      row.item.name,
      row.learnt?.date ?? "",
      row.learnt?.instructorName ?? "",
      row.taught?.date ?? "",
      row.taught?.instructorName ?? "",
      row.completed?.date ?? "",
      row.completed?.instructorName ?? "",
    ]),
    [],
    ["Date", "Aircraft", "Instructor", "Dual", "Solo", "Taught", "Learnt", "Notes"],
    ...visibleFlights(directory.flights, student.id).map((flight) => [
      flight.flownOn,
      flight.aircraftRegistration ?? "",
      flight.instructorName ?? "",
      String(flight.dualHours),
      String(flight.soloHours),
      flight.taught.join("; "),
      flight.learnt.join("; "),
      flight.notes ?? "",
    ]),
  ];
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\n");
  const filename = `${student.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ccat.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
