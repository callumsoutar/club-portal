"use client";

import Link from "next/link";
import { LogInIcon } from "lucide-react";

import { ClubMark } from "@/components/flight/logo";
import { NavMain } from "@/components/flight/nav-main";
import { NavSecondary } from "@/components/flight/nav-secondary";
import { NavUser } from "@/components/flight/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/flight/ui/sidebar";
import { navSections, PROFILE_NAV } from "@/lib/flight/nav";
import { cn } from "@/lib/flight/utils";
import type { AppRole } from "@/lib/flight/types";

export interface ShellUser {
  name: string | null;
  email: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  flightRole: AppRole | null;
  safetyAdmin: boolean;
  /** Null for signed-out visitors. */
  user: ShellUser | null;
  companyName: string;
  logoUrl: string | null;
}

export function AppSidebar({
  flightRole,
  safetyAdmin,
  user,
  companyName,
  logoUrl,
  ...props
}: AppSidebarProps) {
  const sections = navSections({ role: flightRole, safetyAdmin });
  const secondary = flightRole
    ? [{ title: PROFILE_NAV.title, href: PROFILE_NAV.href, icon: PROFILE_NAV.icon }]
    : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-(--header-height) items-center justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-2">
        <ClubBrand companyName={companyName} logoUrl={logoUrl} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain sections={sections} />
        {secondary.length > 0 ? (
          <NavSecondary items={secondary} className="mt-auto" />
        ) : null}
      </SidebarContent>

      <SidebarFooter className="items-center border-t border-sidebar-border px-3 py-2.5 group-data-[collapsible=icon]:px-2">
        {user ? (
          <NavUser
            showProfile={flightRole !== null}
            user={{ name: user.name ?? "Club member", email: user.email }}
          />
        ) : (
          <SignInButton />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ClubBrand({
  companyName,
  logoUrl,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip={companyName}
          className="h-10 rounded-lg px-1.5 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:rounded-lg"
        >
          <Link
            href="/"
            aria-label={`${companyName} home`}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
          >
            <ClubMark
              companyName={companyName}
              className={cn(
                "group-data-[collapsible=icon]:size-9",
                logoUrl && "hidden group-data-[collapsible=icon]:flex",
              )}
            />
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-8 w-auto max-w-[11rem] object-contain object-left group-data-[collapsible=icon]:hidden"
              />
            ) : (
              <span className="truncate text-sm font-semibold tracking-[-0.01em] text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
                {companyName}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SignInButton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Sign in"
          variant="outline"
          className="h-9 justify-center gap-2 rounded-lg font-medium text-foreground group-data-[collapsible=icon]:rounded-lg"
        >
          <Link href="/login">
            <LogInIcon />
            <span>Sign in</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
