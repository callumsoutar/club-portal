import "server-only";

import { cache } from "react";

import { getAdminUser } from "@/lib/auth";
import type { CompanySettings } from "@/lib/company-settings";
import { getSessionUser, type SessionUser } from "@/lib/flight/auth";
import { isMemberLoginEnabled } from "@/lib/flight/queries";
import type { AppRole } from "@/lib/flight/types";
import { getCompanySettings } from "@/lib/get-company-settings";

export interface PortalViewer {
  session: SessionUser | null;
  /** Flight role used for navigation and home-page content. */
  role: AppRole | null;
  safetyAdmin: boolean;
  user: { name: string | null; email: string } | null;
  company: CompanySettings;
  memberLoginEnabled: boolean;
}

/**
 * Who is looking at the portal, resolved once per request. A member whose
 * club has switched member login off is treated as a guest, matching the
 * redirect the signed-in area applies.
 */
export const getPortalViewer = cache(async (): Promise<PortalViewer> => {
  const [session, safetyAdminUser, company, memberLoginEnabled] =
    await Promise.all([
      getSessionUser(),
      getAdminUser(),
      getCompanySettings(),
      isMemberLoginEnabled(),
    ]);

  const safetyAdmin = safetyAdminUser !== null;
  const sessionRole = session?.profile.role ?? null;
  const memberBlocked =
    sessionRole === "member" && !memberLoginEnabled && !safetyAdmin;
  const role = memberBlocked ? null : sessionRole;
  const signedIn = Boolean(session) || safetyAdmin;

  return {
    session: memberBlocked ? null : session,
    role,
    safetyAdmin,
    user: signedIn
      ? {
          name: session?.profile.full_name?.trim() || null,
          email: session?.email ?? safetyAdminUser?.email ?? "",
        }
      : null,
    company,
    memberLoginEnabled,
  };
});
