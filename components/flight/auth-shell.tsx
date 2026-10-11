import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/flight/logo";
import { getCompanySettings } from "@/lib/get-company-settings";

/**
 * Split auth layout. Form on the left, club photo on the right on wide
 * screens; the photo drops away on phones so the form is above the fold.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const company = await getCompanySettings();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label={`${company.companyName} home`} className="min-w-0">
            <Logo companyName={company.companyName} clubLogoUrl={company.logoUrl} />
          </Link>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Home
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-center pt-8 pb-6 sm:items-center sm:py-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/kapiti-club.jpg"
          alt={`${company.companyName} hangar and aircraft`}
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
