import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { FormBuilder } from "@/components/flight/admin/form-builder";
import { Page } from "@/components/portal/page";
import { requireAdmin } from "@/lib/flight/auth";
import { getTemplateById } from "@/lib/flight/queries";

export const metadata = { title: "Edit form" };

type Params = Promise<{ id: string }>;

export default async function EditTemplatePage({
  params,
}: {
  params: Params;
}) {
  await requireAdmin();
  const { id } = await params;
  const template = await getTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <Page className="gap-5">
      <Link
        href="/admin/form-builder"
        className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Form builder
      </Link>
      <FormBuilder template={template} />
    </Page>
  );
}
