import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { InstructorTraining } from "@/components/flight/record-training-forms";
import { Page } from "@/components/portal/page";
import { requireStaff } from "@/lib/flight/auth";
import { getActiveInstructors } from "@/lib/flight/queries";
import { getTrainingDashboardFor } from "@/lib/flight/training-queries";
import { getCompanySettings } from "@/lib/get-company-settings";

export const metadata = { title: "Student training" };

export default async function InstructorStudentTrainingPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [staff, company, instructors] = await Promise.all([
    requireStaff(),
    getCompanySettings(),
    getActiveInstructors(),
  ]);
  const data = await getTrainingDashboardFor(userId);
  if (!data) notFound();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: company.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <Page width="wide">
      <Link
        href="/fly/instructor/training"
        className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Students
      </Link>
      <InstructorTraining
        data={data}
        timeZone={company.timeZone}
        userId={userId}
        today={today}
        defaultInstructorId={instructors.find((instructor) => instructor.profile_id === staff.id)?.id ?? null}
        lessons={data.enrollments.flatMap((enrollment) =>
          enrollment.lessons.map((lesson) => ({
            id: lesson.lessonId,
            syllabusName: enrollment.syllabusName,
            order: lesson.order,
            title: lesson.title,
          })),
        )}
        enrollments={data.enrollments.map((enrollment) => ({
          id: enrollment.id,
          label: enrollment.syllabusName,
        }))}
        instructors={instructors.map((instructor) => ({ id: instructor.id, name: instructor.full_name }))}
      />
    </Page>
  );
}
