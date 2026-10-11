import { redirect } from "next/navigation";

import { ClubSettingsForm } from "@/components/flight/admin/club-settings-form";
import { Page, PageHeader } from "@/components/portal/page";
import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { getClubSettings } from "@/lib/flight/queries";
import { getCompanySettings } from "@/lib/get-company-settings";

export const metadata = { title: "Club settings" };

export default async function ClubSettingsPage() {
  const [safetyAdmin, session, company, club] = await Promise.all([
    getAdminUser(),
    getSessionUser(),
    getCompanySettings(),
    getClubSettings(),
  ]);

  const flightAdmin = session?.profile.role === "admin";
  if (!safetyAdmin && !flightAdmin) redirect("/fly");

  return (
    <Page width="wide" className="gap-6">
      <PageHeader
        title="Club settings"
        description="Club name, logo, member login, and authorisation email."
      />
      <ClubSettingsForm
        key={`${company.companyName}:${company.logoUrl ?? ""}:${club?.updated_at ?? ""}`}
        companyName={company.companyName}
        logoUrl={company.logoUrl}
        settings={club}
      />
    </Page>
  );
}
