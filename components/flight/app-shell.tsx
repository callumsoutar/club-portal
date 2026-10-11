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
 * The portal chrome. One sidebar for every page so Home, flights, the
 * briefing-room TV and club admin read as one product.
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
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "4rem",
          "--header-height": "3.25rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        flightRole={role}
        safetyAdmin={safetyAdmin}
        user={user}
        companyName={companyName}
        logoUrl={logoUrl}
      />
      <SidebarInset className="min-w-0 bg-background">
        <SiteHeader companyName={companyName} />
        <div className="@container/main flex flex-1 flex-col py-6 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
