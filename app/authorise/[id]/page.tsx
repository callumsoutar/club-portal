import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";

import { AuthorisationWizard } from "@/components/flight/wizard/authorisation-wizard";
import { EmptyState } from "@/components/flight/empty-state";
import { Button } from "@/components/flight/ui/button";
import { buildAuthorisationPrefill } from "@/lib/flight/authorisation-prefill";
import { getSessionUser } from "@/lib/flight/auth";
import {
  getActiveAircraft,
  getActiveInstructors,
  getPublishedTemplateById,
  getPublishedTemplates,
  isMemberLoginEnabled,
} from "@/lib/flight/queries";
import { getCompanySettings } from "@/lib/get-company-settings";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const template = await getPublishedTemplateById(id);
  return {
    title: template ? template.name : "Authorisation form",
  };
}

export default async function AuthoriseFormPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const [template, aircraft, instructors, user, company, published, memberLoginEnabled] =
    await Promise.all([
      getPublishedTemplateById(id),
      getActiveAircraft(),
      getActiveInstructors(),
      getSessionUser(),
      getCompanySettings(),
      getPublishedTemplates(),
      isMemberLoginEnabled(),
    ]);

  // With multiple published forms, cancel returns to the picker.
  const cancelHref = published.length > 1 ? "/authorise" : "/";

  if (!template) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5">
        <EmptyState
          icon={FileWarning}
          title="Form not available"
          description="This authorisation form isn't published, or it may have been removed. Pick another form if one is available."
          action={
            <Button asChild variant="outline">
              <Link href="/authorise">View available forms</Link>
            </Button>
          }
          className="w-full"
        />
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <AuthorisationWizard
      template={template}
      sources={{ aircraft, instructors }}
      prefill={buildAuthorisationPrefill(user)}
      cancelHref={cancelHref}
      companyName={company.companyName}
      clubLogoUrl={company.logoUrl}
      offerAccount={!user && memberLoginEnabled}
    />
  );
}
