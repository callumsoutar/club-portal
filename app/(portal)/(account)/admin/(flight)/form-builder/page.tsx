import { TemplateManager } from "@/components/flight/admin/template-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllTemplates } from "@/lib/flight/queries";
import { Page } from "@/components/portal/page";

export const metadata = { title: "Form builder" };

export default async function FormBuilderPage() {
  await requireAdmin();
  const templates = await getAllTemplates();

  return (
    <Page width="wide" className="gap-6">
      <TemplateManager templates={templates} />
    </Page>
  );
}
