import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { isMemberLoginEnabled } from "@/lib/flight/queries";

/**
 * Signed-in area: flights and club management. The portal shell comes from
 * the parent layout; this only gates access.
 */
export default async function AccountLayout({
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

  return children;
}
