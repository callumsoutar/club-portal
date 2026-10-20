import { StudentRoster } from "@/components/flight/student-roster";
import { Page, PageHeader } from "@/components/portal/page";
import { requireStaff } from "@/lib/flight/auth";
import { getTrainingRoster } from "@/lib/flight/training-queries";
import { getCompanySettings } from "@/lib/get-company-settings";
import { calendarDateInTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Students" };

export default async function InstructorTrainingPage() {
  const [, company] = await Promise.all([requireStaff(), getCompanySettings()]);
  const rows = await getTrainingRoster(company.timeZone);
  const today = calendarDateInTimeZone(new Date(), company.timeZone);

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="Students"
        description="Choose a syllabus to see who is enrolled. Graduated and withdrawn students stay out of the list until you open them."
      />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No students are enrolled yet. A club admin can add a syllabus and enrol students from Club settings.
        </p>
      ) : (
        <StudentRoster rows={rows} timeZone={company.timeZone} today={today} />
      )}
    </Page>
  );
}
