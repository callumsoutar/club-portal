import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [admin, session] = await Promise.all([getAdminUser(), getSessionUser()]);
  const flightAdmin = session?.profile.role === "admin";

  if (!admin && !flightAdmin) {
    if (session) redirect("/fly");
    redirect("/login?next=/admin");
  }

  return children;
}
