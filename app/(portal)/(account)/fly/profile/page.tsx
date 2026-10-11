import { ProfileForm } from "@/components/flight/profile-form";
import { Page, PageHeader } from "@/components/portal/page";
import { requireUser } from "@/lib/flight/auth";
import { getActiveAircraft } from "@/lib/flight/queries";

export const metadata = { title: "Profile & currency" };

export default async function ProfilePage() {
  const user = await requireUser();
  const aircraft = await getActiveAircraft();

  return (
    <Page width="narrow" className="gap-6">
      <PageHeader
        title="Profile & currency"
        description="Keep these up to date and your next authorisation fills itself in."
      />
      <ProfileForm profile={user.profile} pilot={user.pilot} aircraft={aircraft} />
    </Page>
  );
}
