import { ImportPanel } from "@/components/ccat/import-panel";
import { Page, PageHeader } from "@/components/portal/page";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllInstructors } from "@/lib/flight/queries";

export const metadata = { title: "Import training" };

export default async function ImportPage() {
  await requireAdmin();
  const [directory, instructors] = await Promise.all([getCcatDirectory(), getAllInstructors()]);

  return (
    <Page>
      <PageHeader
        eyebrow="Training"
        title="Import"
        description="Review every row before it is saved. Unmatched students, instructors, or exercises stay out until you choose a match. Running the same file again skips records that were already imported."
      />
      <ImportPanel
        directory={{
          students: directory.students.map((student) => ({ id: student.id, fullName: student.fullName })),
          instructors: instructors.map((instructor) => ({ id: instructor.id, fullName: instructor.full_name })),
          items: directory.items.map((item) => ({ id: item.id, name: item.name, categoryKey: item.categoryKey })),
          existingImportKeys: directory.events.map((event) => event.importKey).filter((key): key is string => Boolean(key)),
        }}
      />
    </Page>
  );
}
