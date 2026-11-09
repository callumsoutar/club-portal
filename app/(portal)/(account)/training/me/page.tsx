import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CategoryLinks,
  FlightHistory,
  FocusLinks,
  ProgressTracker,
  StatusPill,
  categoryHelp,
  categoryList,
  parseFocus,
  syllabusEmpty,
  syllabusSearchPlaceholder,
} from "@/components/ccat/student-record";
import { SyllabusTable } from "@/components/ccat/syllabus-table";
import { Page, PageHeader } from "@/components/portal/page";
import { studentProgress } from "@/lib/ccat/progress";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { visibleFlights } from "@/lib/ccat/present";
import { requireUser } from "@/lib/flight/auth";
import { formatDate } from "@/lib/flight/format";

export const metadata = { title: "My training" };

export default async function MyTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; focus?: string }>;
}) {
  const user = await requireUser();
  const [{ category, focus: focusParam }, directory] = await Promise.all([searchParams, getCcatDirectory()]);
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
  const focus = parseFocus(focusParam);
  const inCategory = progress.items.filter((row) => row.item.categoryKey === current && (row.item.isActive || row.status !== "not_started"));
  const rows = inCategory.filter((row) => {
    if (focus === "open") return row.status !== "complete";
    if (focus === "done") return row.status === "complete";
    return true;
  });
  const intake = directory.intakes.find((entry) => entry.id === student.intakeId);

  return (
    <Page width="wide">
      <PageHeader
        eyebrow={intake?.name ?? "C Cat"}
        title={student.fullName}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill status={progress.status} />
            <span>Started {formatDate(student.startedOn ?? intake?.startsOn)}. This record is read only.</span>
            <Link href="/training/questions" className="font-medium text-primary">POF questions</Link>
          </span>
        }
      />
      <ProgressTracker progress={progress} />
      <div className="flex flex-col gap-3">
        <CategoryLinks
          categories={categories}
          current={current}
          baseHref="/training/me"
          rows={progress.items}
          focus={focus}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {categoryHelp(current)}
            {current === "flight" ? (
              <>
                {" "}
                Next to learn <span className="font-medium text-foreground">{progress.nextLearn ?? "the syllabus"}</span>
                {" · "}
                next to teach <span className="font-medium text-foreground">{progress.nextTeach ?? "nothing"}</span>.
              </>
            ) : null}
          </p>
          <FocusLinks
            baseHref="/training/me"
            category={current}
            focus={focus}
            openCount={inCategory.filter((row) => row.status !== "complete").length}
            doneCount={inCategory.filter((row) => row.status === "complete").length}
          />
        </div>
        <SyllabusTable
          rows={rows}
          staff={false}
          studentId={student.id}
          today=""
          instructors={[]}
          defaultInstructorId=""
          empty={syllabusEmpty(focus, current)}
          searchPlaceholder={syllabusSearchPlaceholder(current)}
        />
      </div>
      {current === "flight" ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Flights</h2>
          <FlightHistory flights={visibleFlights(directory.flights, student.id)} staff={false} context={null} />
        </section>
      ) : null}
    </Page>
  );
}
