import { AircraftManager } from "@/components/flight/admin/aircraft-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllAircraft } from "@/lib/flight/queries";
import { Page } from "@/components/portal/page";

export const metadata = { title: "Fleet" };

export default async function AdminAircraftPage() {
  await requireAdmin();
  const aircraft = await getAllAircraft();

  return (
    <Page width="wide" className="gap-6">
      <AircraftManager aircraft={aircraft} />
    </Page>
  );
}
