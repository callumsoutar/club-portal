import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/flight/logo";
import { getClubLogoUrl } from "@/lib/flight/queries";

/**
 * Split auth layout (shadcn login-02). Form on the left, club photo on the right.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const clubLogoUrl = await getClubLogoUrl();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="inline-flex items-center">
            <Logo clubLogoUrl={clubLogoUrl} showMark={false} />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/kapiti-club.jpg"
          alt="Kapiti Aero Club hangar and aircraft"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"
        />
      </div>
    </div>
  );
}
