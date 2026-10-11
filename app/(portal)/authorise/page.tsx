import Link from "next/link";
import { redirect } from "next/navigation";
import { FileWarning } from "lucide-react";

import { EmptyState } from "@/components/flight/empty-state";
import { Button } from "@/components/flight/ui/button";
import { FormPicker } from "@/components/flight/wizard/form-picker";
import { Page, PageHeader } from "@/components/portal/page";
import { getPublishedTemplates } from "@/lib/flight/queries";
import { getPortalViewer } from "@/lib/portal/viewer";

export const metadata = { title: "Authorise a flight" };

export default async function AuthorisePage() {
  const [templates, viewer] = await Promise.all([
    getPublishedTemplates(),
    getPortalViewer(),
  ]);

  // With one form there is nothing to choose; go straight to it.
  if (templates.length === 1) redirect(`/authorise/${templates[0]!.id}`);

  const canManageForms = viewer.role === "admin";

  return (
    <Page>
      <PageHeader
        title="Authorise a flight"
        description="Choose the form that matches your flight. An instructor reviews it before you go."
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={FileWarning}
          title="No authorisation form is available"
          description={
            canManageForms
              ? "Publish a form in the form builder so pilots can submit authorisations."
              : "The club hasn't published an authorisation form yet. Please speak to an instructor before you fly."
          }
          action={
            canManageForms ? (
              <Button asChild variant="outline">
                <Link href="/admin/form-builder">Open form builder</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <FormPicker
          templates={templates}
          offerAccount={!viewer.user && viewer.memberLoginEnabled}
        />
      )}
    </Page>
  );
}
