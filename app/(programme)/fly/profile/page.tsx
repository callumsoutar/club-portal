import { ProfileForm } from "@/components/flight/profile-form";
import { requireUser } from "@/lib/flight/auth";
import { getActiveAircraft } from "@/lib/flight/queries";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const aircraft = await getActiveAircraft();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 lg:px-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Keep these up to date and your next authorisation fills itself in.
        </p>
      </header>

      <ProfileForm profile={user.profile} pilot={user.pilot} aircraft={aircraft} />
    </div>
  );
}
