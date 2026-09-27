import { AircraftManager } from "@/components/flight/admin/aircraft-manager";
import { requireAdmin } from "@/lib/flight/auth";
import { getAllAircraft } from "@/lib/flight/queries";

export const metadata = { title: "Fleet" };

export default async function AdminAircraftPage() {
  await requireAdmin();
  const aircraft = await getAllAircraft();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 lg:px-6">
      <AircraftManager aircraft={aircraft} />
    </div>
  );
}
