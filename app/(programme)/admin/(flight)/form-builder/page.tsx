import { TemplateManager } from "@/components/flight/admin/template-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllTemplates } from "@/lib/flight/queries";

export const metadata = { title: "Form Builder" };

export default async function FormBuilderPage() {
  await requireAdmin();
  const templates = await getAllTemplates();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 lg:px-6">
      <TemplateManager templates={templates} />
    </div>
  );
}
