"use client";

import { AppSidebar } from "@/components/flight/app-sidebar";
import { SiteHeader } from "@/components/flight/site-header";
import { SidebarInset, SidebarProvider } from "@/components/flight/ui/sidebar";
import type { AppRole } from "@/lib/flight/types";

interface AppShellProps {
  role: AppRole | null;
  safetyAdmin: boolean;
  name: string | null;
  email: string;
  children: React.ReactNode;
}

/**
 * Signed-in chrome — dark navy sidebar, light workspace, matching the
 * dashboard-01 structure with a Moses-style colour split.
 */
export function AppShell({ role, safetyAdmin, name, email, children }: AppShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16.5rem",
          "--header-height": "3.25rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar flightRole={role} safetyAdmin={safetyAdmin} name={name} email={email} />
      <SidebarInset className="min-w-0 bg-muted">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-5 py-5 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
