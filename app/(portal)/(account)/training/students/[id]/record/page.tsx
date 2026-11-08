import { notFound } from "next/navigation";

import { PrintButton } from "@/components/ccat/print-button";

import { formatHours } from "@/components/ccat/student-record";
import { studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { activeEvents, visibleFlights } from "@/lib/ccat/present";
import { hasRole, requireUser } from "@/lib/flight/auth";
import { formatDate } from "@/lib/flight/format";

export const metadata = { title: "Training record" };

export default async function TrainingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const directory = await getCcatDirectory();
  const student = directory.students.find((entry) => entry.id === id);
  const allowed = student && (hasRole(user.profile.role, "instructor") || student.profileId === user.id);
  if (!student || !allowed) notFound();
  const progress = studentProgress(student, directory.items, directory.events, directory.flights);
  const intake = directory.intakes.find((entry) => entry.id === student.intakeId);
  const categories = [...directory.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 print:max-w-none print:px-0">
      <header>
        <p className="text-sm text-muted-foreground">Kāpiti Aero Club · C Cat training record</p>
        <h1 className="mt-1 text-2xl font-semibold">{student.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {intake?.name ?? "No intake"} · Started {formatDate(student.startedOn ?? intake?.startsOn)} · {progress.status}
        </p>
        <p className="text-sm">
          {formatHours(progress.dualHours)} dual · {formatHours(progress.soloHours)} solo · Flight learnt {progress.flightLearntPct}% · taught {progress.flightTaughtPct}%
        </p>
        <PrintButton />
      </header>
      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="text-base font-semibold">{category.name}</h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1 pr-3 font-medium">Exercise</th>
                <th className="py-1 pr-3 font-medium">{category.signoffMode === "single" ? "Completed" : "Learnt"}</th>
                {category.signoffMode === "learnt_taught" ? <th className="py-1 font-medium">Taught</th> : null}
              </tr>
            </thead>
            <tbody>
              {progress.items
                .filter((row) => row.item.categoryId === category.id && (row.item.isActive || row.status !== "not_started"))
                .map((row) => (
                  <tr key={row.item.id} className="border-b">
                    <td className="py-1 pr-3">{row.item.name}</td>
                    <td className="py-1 pr-3">{stamp(category.signoffMode === "single" ? row.completed : row.learnt)}</td>
                    {category.signoffMode === "learnt_taught" ? <td className="py-1">{stamp(row.taught)}</td> : null}
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
      <section>
        <h2 className="text-base font-semibold">Flights</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {visibleFlights(directory.flights, student.id).map((flight) => (
              <tr key={flight.id} className="border-b align-top">
                <td className="py-1 pr-3 whitespace-nowrap">{formatDate(flight.flownOn)}</td>
                <td className="py-1 pr-3">{flight.aircraftRegistration || "—"}</td>
                <td className="py-1 pr-3">{flight.instructorName || "—"}</td>
                <td className="py-1 pr-3">{formatHours(flight.dualHours)} / {formatHours(flight.soloHours)}</td>
                <td className="py-1">
                  Taught {flight.taught.join(", ") || "—"}. Learnt {flight.learnt.join(", ") || "—"}.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-muted-foreground">Events considered: {activeEvents(directory.events, student.id).length} sign-offs.</p>
    </article>
  );
}

function stamp(value: { date: string; instructorName: string | null } | null) {
  if (!value) return "—";
  return `${formatDate(value.date)}${value.instructorName ? ` · ${value.instructorName}` : ""}`;
}
