import { redirect } from "next/navigation";

/** Old flight settings URL. Identity and operations now live together. */
export default function FlightSettingsRedirect() {
  redirect("/admin/settings");
}
