import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/flight/auth";

export default async function SyllabusPage() {
  await requireAdmin();
  redirect("/admin/settings?tab=ccat");
}
