import { InstructorManager } from "@/components/flight/admin/instructor-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllInstructors } from "@/lib/flight/queries";

export const metadata = { title: "Instructors" };

export default async function AdminInstructorsPage() {
  await requireAdmin();
  const instructors = await getAllInstructors();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 lg:px-6">
      <InstructorManager instructors={instructors} />
    </div>
  );
}
