"use client";

import { NavMain } from "@/components/flight/nav-main";
import { NavSecondary } from "@/components/flight/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/flight/ui/sidebar";
import { navSections, PROFILE_NAV } from "@/lib/flight/nav";
import type { AppRole } from "@/lib/flight/types";

export interface ShellUser {
  name: string | null;
  email: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  flightRole: AppRole | null;
  safetyAdmin: boolean;
}

/**
 * Full-height navigation rail. The logo and account menu live in the top bar;
 * the rail's header row lines up with that bar and holds the collapse toggle.
 */
export function AppSidebar({ flightRole, safetyAdmin, ...props }: AppSidebarProps) {
  const sections = navSections({ role: flightRole, safetyAdmin });
  const secondary = flightRole
    ? [{ title: PROFILE_NAV.title, href: PROFILE_NAV.href, icon: PROFILE_NAV.icon }]
    : [];

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border" {...props}>
      <SidebarHeader className="h-(--header-height) flex-row items-center border-b border-sidebar-border px-2.5 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <SidebarTrigger className="size-8 text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white" />
      </SidebarHeader>
      <SidebarContent className="gap-0 pt-3">
        <NavMain sections={sections} />
        {secondary.length > 0 ? (
          <NavSecondary items={secondary} className="mt-auto border-t border-sidebar-border pt-3 pb-3" />
        ) : null}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
