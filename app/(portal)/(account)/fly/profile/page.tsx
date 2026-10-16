import { ProfileForm } from "@/components/flight/profile-form";
import { Page } from "@/components/portal/page";
import { requireUser } from "@/lib/flight/auth";

export const metadata = { title: "Profile & currency" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <Page width="narrow" className="gap-6">
      <ProfileForm profile={user.profile} pilot={user.pilot} />
    </Page>
  );
}
