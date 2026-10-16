import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TrafficBoard } from "@/components/traffic/traffic-board";
import { getSessionUser, hasRole } from "@/lib/flight/auth";
import { getCompanySettings } from "@/lib/get-company-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Traffic",
  description: "Live aircraft within 25 nautical miles of NZPP.",
};

export default async function TrafficPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/traffic");
  if (!hasRole(user.profile.role, "admin")) redirect("/fly");

  const company = await getCompanySettings();

  return <TrafficBoard companyName={company.companyName} logoUrl={company.logoUrl} />;
}
