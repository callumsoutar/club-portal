import { SyllabusManager } from "@/components/ccat/syllabus-manager";
import { Page, PageHeader } from "@/components/portal/page";
import { getCcatDirectory } from "@/lib/ccat/queries";
import { requireAdmin } from "@/lib/flight/auth";

export const metadata = { title: "C Cat syllabus" };

export default async function SyllabusPage() {
  await requireAdmin();
  const directory = await getCcatDirectory();
  const categories = [...directory.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Page>
      <PageHeader
        eyebrow="Training"
        title="Syllabus"
        description="The same syllabus is shared by every intake. Disabling an item keeps the training records already signed off against it."
      />
      <SyllabusManager categories={categories} items={directory.items} />
    </Page>
  );
}
