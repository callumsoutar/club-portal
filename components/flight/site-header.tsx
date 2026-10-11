"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClubMark } from "@/components/flight/logo";
import { Separator } from "@/components/flight/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/flight/ui/sidebar";
import { UserMenu } from "@/components/flight/user-menu";
import { pageTitleFromPath } from "@/lib/flight/nav";

/**
 * Bar across the top of the page: club logo and current page on the left,
 * account menu on the right. Phones get the menu toggle here too.
 */
export function SiteHeader({
  companyName,
  logoUrl,
  user,
  showProfile,
}: {
  companyName: string;
  logoUrl: string | null;
  user: { name: string; email: string } | null;
  showProfile: boolean;
}) {
  const pathname = usePathname();
  const title = pageTitleFromPath(pathname);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center border-b bg-card">
      <div className="flex w-full min-w-0 items-center gap-3 px-3 sm:px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 size-9 text-muted-foreground hover:text-foreground md:hidden" />

        <Link
          href="/"
          aria-label={`${companyName} home`}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-9 w-auto max-w-[9rem] object-contain object-left sm:max-w-[11rem]"
            />
          ) : (
            <>
              <ClubMark companyName={companyName} className="size-7 rounded-md bg-sidebar text-[10px] text-white" />
              <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                {companyName}
              </span>
            </>
          )}
        </Link>

        {title ? (
          <>
            <Separator orientation="vertical" className="mx-1 hidden data-[orientation=vertical]:h-5 sm:block" />
            <p className="hidden truncate text-sm font-medium text-muted-foreground sm:block" aria-current="page">
              {title}
            </p>
          </>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center">
          <UserMenu user={user} showProfile={showProfile} />
        </div>
      </div>
    </header>
  );
}
