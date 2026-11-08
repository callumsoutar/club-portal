import { redirect } from "next/navigation";

import {
  CategoryLinks,
  FlightHistory,
  ProgressChart,
  StudentProgressSummary,
  SyllabusTable,
  categoryList,
} from "@/components/ccat/student-record";
import { Page, PageHeader } from "@/components/portal/page";
import { studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { activeEvents, visibleFlights } from "@/lib/ccat/present";
import { requireUser } from "@/lib/flight/auth";
import { formatDate } from "@/lib/flight/format";

export const metadata = { title: "My training" };

export default async function MyTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const [{ category }, directory] = await Promise.all([searchParams, getCcatDirectory()]);
  const student = directory.students.find((entry) => entry.profileId === user.id);
  if (!student) {
    return (
      <Page>
        <PageHeader
          eyebrow="Training"
          title="My training"
          description="Your login is not linked to a C Cat training record."
        />
      </Page>
    );
  }
  if (user.profile.role !== "member") redirect(`/training/students/${student.id}`);
  const progress = studentProgress(student, directory.items, directory.events, directory.flights);
  const categories = categoryList(directory.items);
  const current = categories.some((entry) => entry.key === category) ? category! : categories[0]?.key ?? "flight";
  const intake = directory.intakes.find((entry) => entry.id === student.intakeId);
  const plans = directory.plans.filter((plan) => plan.studentId === student.id);

  return (
    <Page width="wide">
      <PageHeader
        eyebrow={intake?.name ?? "C Cat"}
        title={student.fullName}
        description={`${progress.status}. Started ${formatDate(student.startedOn ?? intake?.startsOn)}. This record is read only.`}
      />
      <StudentProgressSummary
        learnt={progress.flightLearntPct}
        taught={progress.flightTaughtPct}
        overall={progress.flightOverallPct}
        dual={progress.dualHours}
        solo={progress.soloHours}
      />
      <ProgressChart rows={progress.items} events={activeEvents(directory.events, student.id)} />
      <CategoryLinks categories={categories} current={current} baseHref="/training/me" />
      <SyllabusTable
        rows={progress.items.filter((row) => row.item.categoryKey === current && (row.item.isActive || row.status !== "not_started"))}
        staff={false}
        studentId={student.id}
        today=""
        instructors={[]}
        defaultInstructorId=""
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Flights</h2>
        <FlightHistory flights={visibleFlights(directory.flights, student.id)} staff={false} context={null} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Planned lessons</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons are planned yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {plans.map((plan) => (
              <li key={plan.id} className="px-3 py-3 text-sm">
                <p className="font-medium">Week of {formatDate(plan.weekStart)}</p>
                <p className="text-muted-foreground">
                  Teach: {names(directory.items, plan.items.filter((item) => item.kind === "taught").map((item) => item.itemId))}
                </p>
                <p className="text-muted-foreground">
                  Learn: {names(directory.items, plan.items.filter((item) => item.kind === "learnt").map((item) => item.itemId))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function names(items: { id: string; name: string }[], ids: string[]) {
  const labels = ids.map((id) => items.find((item) => item.id === id)?.name).filter(Boolean);
  return labels.length ? labels.join(", ") : "—";
}
