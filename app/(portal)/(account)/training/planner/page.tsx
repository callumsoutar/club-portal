import Link from "next/link";

import { PlannerForm } from "@/components/ccat/planner-form";
import { Page, PageHeader } from "@/components/portal/page";
import { addDays, mondayOnOrBefore } from "@/lib/ccat/present";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveAircraft, getActiveInstructors } from "@/lib/flight/queries";
import { formatDate } from "@/lib/flight/format";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";
import { Button } from "@/components/flight/ui/button";

export const metadata = { title: "Training planner" };

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireStaff();
  const [{ week }, directory, instructors, aircraft, company] = await Promise.all([
    searchParams,
    getCcatDirectory(),
    getActiveInstructors(),
    getActiveAircraft(),
    getCompanySettings(),
  ]);
  const today = calendarDateInTimeZone(new Date(), company.timeZone);
  const weekStart = mondayOnOrBefore(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const weekEnd = addDays(weekStart, 6);
  const students = directory.students.filter((student) => student.status === "active");
  const plans = directory.plans.filter((plan) => plan.weekStart === weekStart);
  const items = directory.items.filter((item) => item.categoryKey === "flight" && item.isActive);

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="Weekly plan"
        description={`${formatDate(weekStart)} to ${formatDate(weekEnd)}. Planned exercises stay off the syllabus until a flight is logged.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/training/planner/print?week=${weekStart}`}>Print plan</Link>
          </Button>
        }
      />
      <form className="flex flex-wrap items-end gap-3" action="/training/planner">
        <div className="space-y-2">
          <label htmlFor="week" className="text-sm font-medium">Week</label>
          <input id="week" name="week" type="date" defaultValue={weekStart} className="h-10 rounded-lg border bg-background px-3 text-sm sm:h-9" />
        </div>
        <Button type="submit" variant="outline">Show week</Button>
        <Link href={`/training/planner?week=${addDays(weekStart, -7)}`} className="text-sm text-muted-foreground">Previous</Link>
        <Link href={`/training/planner?week=${addDays(weekStart, 7)}`} className="text-sm text-muted-foreground">Next</Link>
      </form>
      <PlannerForm
        weekStart={weekStart}
        students={students.map((student) => ({ id: student.id, name: student.fullName }))}
        instructors={instructors.map((instructor) => ({ id: instructor.id, name: instructor.full_name }))}
        aircraft={aircraft.map((entry) => ({ registration: entry.registration }))}
        items={items.map((item) => ({ id: item.id, name: item.name }))}
        plans={plans}
      />
    </Page>
  );
}
