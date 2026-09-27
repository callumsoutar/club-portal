import type { AnswerMap } from "@/lib/flight/types";
import type { getSessionUser } from "@/lib/flight/auth";

/** Prefill the wizard from a signed-in pilot profile. */
export function buildAuthorisationPrefill(
  user: Awaited<ReturnType<typeof getSessionUser>>,
): AnswerMap {
  if (!user) return {};

  const today = new Date().toISOString().slice(0, 10);

  return {
    pilot_name: user.profile.full_name ?? "",
    pilot_phone: user.profile.phone ?? "",
    pilot_email: user.email,
    flight_date: today,
    licence_type: user.pilot?.licence_type ?? "",
    bfr_expiry: user.pilot?.bfr_expiry ?? "",
    medical_expiry: user.pilot?.medical_expiry ?? "",
    aircraft_id: user.pilot?.preferred_aircraft_id ?? "",
  };
}
