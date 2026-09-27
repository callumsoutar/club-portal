import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { FormBuilder } from "@/components/flight/admin/form-builder";
import { requireAdmin } from "@/lib/flight/auth";
import { getTemplateById } from "@/lib/flight/queries";

export const metadata = { title: "Edit Template" };

type SearchParams = Promise<Record<string, string | undefined>>;
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
    <div className="mx-auto w-full max-w-3xl px-4 lg:px-6">
      <div className="mb-5">
        <Link
          href="/admin/form-builder"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Templates
        </Link>
      </div>
      <FormBuilder template={template} />
    </div>
  );
}
