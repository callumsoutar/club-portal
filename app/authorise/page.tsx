import Link from "next/link";
import { FileWarning } from "lucide-react";

import { FormPicker } from "@/components/flight/wizard/form-picker";
import { AuthorisationWizard } from "@/components/flight/wizard/authorisation-wizard";
import { EmptyState } from "@/components/flight/empty-state";
import { Button } from "@/components/flight/ui/button";
import { buildAuthorisationPrefill } from "@/lib/flight/authorisation-prefill";
import { getSessionUser } from "@/lib/flight/auth";
import {
  getActiveAircraft,
  getActiveInstructors,
  getClubLogoUrl,
  getPublishedTemplateById,
  getPublishedTemplates,
} from "@/lib/flight/queries";

export const metadata = { title: "New authorisation" };

export default async function AuthorisePage() {
  const [templates, user] = await Promise.all([
    getPublishedTemplates(),
    getSessionUser(),
  ]);

  const homeHref = user ? "/fly" : "/";

  if (templates.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
        <EmptyState
          icon={FileWarning}
          title="No form published"
          description="An administrator needs to publish an authorisation form before pilots can submit. If you're an admin, head to the form builder."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/form-builder">Open form builder</Link>
            </Button>
          }
          className="w-full"
        />
      </div>
    );
  }

  if (templates.length > 1) {
    return <FormPicker templates={templates} cancelHref={homeHref} />;
  }

  const only = templates[0]!;
  const [template, aircraft, instructors, clubLogoUrl] = await Promise.all([
    getPublishedTemplateById(only.id),
    getActiveAircraft(),
    getActiveInstructors(),
    getClubLogoUrl(),
  ]);

  if (!template) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
        <EmptyState
          icon={FileWarning}
          title="No form published"
          description="An administrator needs to publish an authorisation form before pilots can submit."
          className="w-full"
        />
      </div>
    );
  }

  return (
    <AuthorisationWizard
      template={template}
      sources={{ aircraft, instructors }}
      prefill={buildAuthorisationPrefill(user)}
      cancelHref={homeHref}
      clubLogoUrl={clubLogoUrl}
    />
  );
}
