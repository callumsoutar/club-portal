import { InstructorManager } from "@/components/flight/admin/instructor-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllInstructors } from "@/lib/flight/queries";
import { Page } from "@/components/portal/page";

export const metadata = { title: "Instructors" };

export default async function AdminInstructorsPage() {
  await requireAdmin();
  const instructors = await getAllInstructors();

  return (
    <Page width="wide" className="gap-6">
      <InstructorManager instructors={instructors} />
    </Page>
  );
}
