import { redirect } from "next/navigation";

import { ClubSettingsForm } from "@/components/flight/admin/club-settings-form";
import { ClubSettingsTabs } from "@/components/flight/admin/club-settings-tabs";
import { TrainingProgrammes } from "@/components/flight/admin/training-programmes";
import { Page, PageHeader } from "@/components/portal/page";
import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { getMembers } from "@/lib/flight/members";
import { getActiveInstructors, getClubSettings } from "@/lib/flight/queries";
import { getTrainingCatalog } from "@/lib/flight/training-queries";
import { getCompanySettings } from "@/lib/get-company-settings";

export const metadata = { title: "Club settings" };

export default async function ClubSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, safetyAdmin, session, company, club] = await Promise.all([
    searchParams,
    getAdminUser(),
    getSessionUser(),
    getCompanySettings(),
    getClubSettings(),
  ]);

  const flightAdmin = session?.profile.role === "admin";
  if (!safetyAdmin && !flightAdmin) redirect("/fly");

  const training = flightAdmin ? await loadTrainingProgrammes() : null;
  const initial = tab === "training" && training ? "training" : "club";

  return (
    <Page width="wide" className="gap-6">
      <PageHeader
        title="Club settings"
        description={
          training
            ? "Club identity and operations, plus the syllabi students train on."
            : "Club name, logo, local time, reserve, member login, and authorisation email."
        }
      />
      <ClubSettingsTabs
        initial={initial}
        showTraining={Boolean(training)}
        club={
          <ClubSettingsForm
            embedded
            key={`${company.companyName}:${company.logoUrl ?? ""}:${company.timeZone}:${club?.updated_at ?? ""}`}
            companyName={company.companyName}
            logoUrl={company.logoUrl}
            timeZone={company.timeZone}
            settings={club}
          />
        }
        training={
          training ? (
            <TrainingProgrammes
              syllabi={training.syllabi}
              members={training.members}
              instructors={training.instructors}
            />
          ) : null
        }
      />
    </Page>
  );
}

async function loadTrainingProgrammes() {
  const [catalog, members, instructors] = await Promise.all([
    getTrainingCatalog(),
    getMembers(),
    getActiveInstructors(),
  ]);
  return {
    syllabi: catalog.syllabi,
    members: members
      .filter((member) => member.profile.is_active)
      .map((member) => ({
        id: member.profile.id,
        name: member.profile.full_name?.trim() || member.profile.email,
      })),
    instructors: instructors.map((instructor) => ({ id: instructor.id, name: instructor.full_name })),
  };
}
