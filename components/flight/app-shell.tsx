"use client";

import { AppSidebar, type ShellUser } from "@/components/flight/app-sidebar";
import { SiteHeader } from "@/components/flight/site-header";
import { SidebarInset, SidebarProvider } from "@/components/flight/ui/sidebar";
import type { AppRole } from "@/lib/flight/types";

interface AppShellProps {
  role: AppRole | null;
  safetyAdmin: boolean;
  /** Null for signed-out visitors, who get the public nav and a sign-in action. */
  user: ShellUser | null;
  companyName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}

/**
 * The portal chrome: a full-height navigation sidebar, and a top bar over the
 * page with the club logo and account menu. One shell for every page so
 * Home, flights and club admin read as one product.
 */
export function AppShell({
  role,
  safetyAdmin,
  user,
  companyName,
  logoUrl,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "15rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar flightRole={role} safetyAdmin={safetyAdmin} />
      <SidebarInset className="min-w-0 bg-background">
        <SiteHeader
          companyName={companyName}
          logoUrl={logoUrl}
          user={user ? { name: user.name ?? "Club member", email: user.email } : null}
          showProfile={role !== null}
        />
        <div className="@container/main flex flex-1 flex-col py-8 md:py-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
