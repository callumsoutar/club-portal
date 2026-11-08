import { redirect } from "next/navigation";

import { SyllabusManager } from "@/components/ccat/syllabus-manager";
import { ClubSettingsForm } from "@/components/flight/admin/club-settings-form";
import { ClubSettingsTabs } from "@/components/flight/admin/club-settings-tabs";
import { TrainingProgrammes } from "@/components/flight/admin/training-programmes";
import { Page, PageHeader } from "@/components/portal/page";
import { getAdminUser } from "@/lib/auth";
import { getCcatDirectory } from "@/lib/ccat/queries";
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

  const extras = flightAdmin
    ? await Promise.all([loadTrainingProgrammes(), loadCcatSyllabus()] as const)
    : null;
  const training = extras?.[0] ?? null;
  const ccat = extras?.[1] ?? null;
  const initial = tab === "ccat" && ccat ? "ccat" : tab === "training" && training ? "training" : "club";

  return (
    <Page width="wide" className="gap-6">
      <PageHeader
        title="Club settings"
        description={
          training
            ? "Club identity and operations, the syllabi students train on, and the C Cat syllabus."
            : "Club name, logo, local time, reserve, member login, and authorisation email."
        }
      />
      <ClubSettingsTabs
        initial={initial}
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
        ccat={
          ccat ? (
            <SyllabusManager categories={ccat.categories} items={ccat.items} />
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

async function loadCcatSyllabus() {
  const directory = await getCcatDirectory();
  return {
    categories: [...directory.categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({
        id: category.id,
        name: category.name,
        signoffMode: category.signoffMode,
      })),
    items: directory.items,
  };
}
