import { redirect } from "next/navigation";

import { AppShell } from "@/components/flight/app-shell";
import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { isMemberLoginEnabled } from "@/lib/flight/queries";

/**
 * One signed-in shell for flights and club management. The sidebar stays
 * mounted while moving between /fly and /admin.
 */
export default async function ProgrammeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, safetyAdmin] = await Promise.all([
    getSessionUser(),
    getAdminUser(),
  ]);

  if (!session && !safetyAdmin) redirect("/login");

  if (session?.profile.role === "member" && !safetyAdmin) {
    const memberLoginEnabled = await isMemberLoginEnabled();
    if (!memberLoginEnabled) redirect("/authorise");
  }

  return (
    <AppShell
      role={session?.profile.role ?? null}
      safetyAdmin={safetyAdmin !== null}
      name={session?.profile.full_name ?? null}
      email={session?.email ?? safetyAdmin?.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
