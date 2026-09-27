"use client";

import { NavMain } from "@/components/flight/nav-main";
import { NavSecondary } from "@/components/flight/nav-secondary";
import { NavUser } from "@/components/flight/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/flight/ui/sidebar";
import { navSections, PROFILE_NAV } from "@/lib/flight/nav";
import type { AppRole } from "@/lib/flight/types";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  flightRole: AppRole | null;
  safetyAdmin: boolean;
  name: string | null;
  email: string;
}

export function AppSidebar({ flightRole, safetyAdmin, name, email, ...props }: AppSidebarProps) {
  const sections = navSections({ role: flightRole, safetyAdmin });
  const secondary = flightRole
    ? [{ title: PROFILE_NAV.title, href: PROFILE_NAV.href, icon: PROFILE_NAV.icon }]
    : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent className="pt-3">
        <NavMain sections={sections} canAuthorise={flightRole !== null} />
        {secondary.length > 0 ? (
          <NavSecondary items={secondary} className="mt-auto" />
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <NavUser
          showProfile={flightRole !== null}
          user={{
            name: name ?? "Pilot",
            email,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
