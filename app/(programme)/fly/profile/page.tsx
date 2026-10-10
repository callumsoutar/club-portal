import { ProfileForm } from "@/components/flight/profile-form";
import { requireUser } from "@/lib/flight/auth";
import { getActiveAircraft } from "@/lib/flight/queries";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const aircraft = await getActiveAircraft();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-12 lg:px-6">
      <header>
        <h2 className="text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">
          Profile & currency
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Keep these up to date and your next authorisation fills itself in.
        </p>
      </header>

      <ProfileForm profile={user.profile} pilot={user.pilot} aircraft={aircraft} />
    </div>
  );
}
