import { redirect } from "next/navigation";

import { MemberManager } from "@/components/flight/admin/member-manager";
import { Page } from "@/components/portal/page";
import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { getMembers } from "@/lib/flight/members";

export const metadata = { title: "Members" };

export default async function AdminMembersPage() {
  const [safetyAdmin, session, members] = await Promise.all([
    getAdminUser(),
    getSessionUser(),
    getMembers(),
  ]);

  const flightAdmin = session?.profile.role === "admin";
  if (!safetyAdmin && !flightAdmin) redirect("/fly");

  return (
    <Page width="wide" className="gap-6">
      <MemberManager
        members={members}
        currentUserId={session?.id ?? safetyAdmin?.id ?? ""}
      />
    </Page>
  );
}
