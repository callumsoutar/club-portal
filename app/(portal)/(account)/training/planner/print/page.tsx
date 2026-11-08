import { notFound } from "next/navigation";

import { PrintButton } from "@/components/ccat/print-button";

import { addDays, itemName, mondayOnOrBefore } from "@/lib/ccat/present";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { requireStaff } from "@/lib/flight/auth";
import { formatDate } from "@/lib/flight/format";

export const metadata = { title: "Weekly training plan" };

export default async function PlannerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireStaff();
  const { week } = await searchParams;
  if (week && !/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound();
  const directory = await getCcatDirectory();
  const weekStart = mondayOnOrBefore(week ?? new Date().toISOString().slice(0, 10));
  const plans = directory.plans.filter((plan) => plan.weekStart === weekStart);
  const instructors = new Map(directory.students.map((student) => [student.id, student.fullName]));

  return (
    <article className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:px-0">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Kāpiti Aero Club · C Cat</p>
        <h1 className="text-2xl font-semibold">Week of {formatDate(weekStart)}</h1>
        <p className="text-sm text-muted-foreground">To {formatDate(addDays(weekStart, 6))}. Planned lessons are not sign-offs.</p>
        <PrintButton />
      </header>
      {plans.length === 0 ? <p className="text-sm">No students are planned this week.</p> : null}
      {plans.map((plan) => (
        <section key={plan.id} className="mb-6 break-inside-avoid border-t pt-4">
          <h2 className="text-base font-semibold">{instructors.get(plan.studentId) ?? "Student"}</h2>
          <p className="text-sm text-muted-foreground">
            {plan.aircraftRegistration || "Aircraft not set"}
            {plan.notes ? ` · ${plan.notes}` : ""}
          </p>
          <p className="mt-2 text-sm">Teach: {labels(directory.items, plan, "taught")}</p>
          <p className="text-sm">Learn: {labels(directory.items, plan, "learnt")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>☐ Pre-flight briefing</li>
            <li>☐ Mass and balance</li>
            <li>☐ Weather and NOTAMs</li>
            <li>☐ Debrief</li>
          </ul>
        </section>
      ))}
    </article>
  );
}

function labels(
  items: Parameters<typeof itemName>[0],
  plan: { items: { itemId: string; kind: string }[] },
  kind: string,
) {
  const names = plan.items.filter((item) => item.kind === kind).map((item) => itemName(items, item.itemId));
  return names.length ? names.join(", ") : "—";
}
