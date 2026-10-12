import { redirect } from "next/navigation";

import { MemberManager } from "@/components/flight/admin/member-manager";
import { Page } from "@/components/portal/page";
import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { getMembers } from "@/lib/flight/members";
import { getAllAircraft } from "@/lib/flight/queries";

export const metadata = { title: "Members" };

export default async function AdminMembersPage() {
  const [safetyAdmin, session, members, aircraft] = await Promise.all([
    getAdminUser(),
    getSessionUser(),
    getMembers(),
    getAllAircraft(),
  ]);

  const flightAdmin = session?.profile.role === "admin";
  if (!safetyAdmin && !flightAdmin) redirect("/fly");

  return (
    <Page width="wide" className="gap-6">
      <MemberManager
        members={members}
        aircraft={aircraft}
        currentUserId={session?.id ?? safetyAdmin?.id ?? ""}
      />
    </Page>
  );
}
