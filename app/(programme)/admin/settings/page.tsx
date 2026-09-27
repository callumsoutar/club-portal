import { redirect } from "next/navigation";

import { ClubSettingsForm } from "@/components/flight/admin/club-settings-form";
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
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 lg:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Club settings</h1>
        <p className="text-sm text-muted-foreground">
          Club name, logo, member login, and authorisation email.
        </p>
      </div>
      <ClubSettingsForm
        key={`${company.companyName}:${company.logoUrl ?? ""}:${club?.updated_at ?? ""}`}
        companyName={company.companyName}
        logoUrl={company.logoUrl}
        settings={club}
      />
    </div>
  );
}
