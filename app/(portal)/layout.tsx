import { AppShell } from "@/components/flight/app-shell";
import { getPortalViewer } from "@/lib/portal/viewer";

/**
 * One shell for the whole portal. Signed-out visitors get Home and
 * Authorise a flight, with a sign-in action. Signed-in users get the nav
 * for their role, including the briefing-room TV for safety admins.
 * Pages enforce their own access.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getPortalViewer();

  return (
    <AppShell
      role={viewer.role}
      safetyAdmin={viewer.safetyAdmin}
      user={viewer.user}
      companyName={viewer.company.companyName}
      logoUrl={viewer.company.logoUrl}
    >
      {children}
    </AppShell>
  );
}
