import "server-only";

import { getAdminUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/flight/auth";
import { createServiceSupabase } from "@/lib/flight/supabase/server";
import type { MemberAccount, PilotProfile, Profile } from "@/lib/flight/types";

type ProfileRow = Profile & {
  pilot_profiles: PilotProfile | PilotProfile[] | null;
};

/** Flight admins and safety editors can open the member directory. */
export async function requireMemberAdmin(): Promise<{ id: string; email: string } | null> {
  const [session, safetyAdmin] = await Promise.all([getSessionUser(), getAdminUser()]);

  if (session?.profile.role === "admin") {
    return { id: session.id, email: session.email };
  }

  if (safetyAdmin) {
    return { id: safetyAdmin.id, email: safetyAdmin.email ?? "admin" };
  }

  return null;
}

export async function getMembers(): Promise<MemberAccount[]> {
  const actor = await requireMemberAdmin();
  if (!actor) return [];

  const supabase = createServiceSupabase();
  const [{ data, error }, { data: roles, error: rolesError }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id, email, full_name, phone, role, avatar_url, is_active, created_at, updated_at,
        pilot_profiles (
          id, profile_id, licence_type, licence_number, bfr_expiry, medical_expiry,
          preferred_aircraft_id, emergency_contact_name, emergency_contact_phone,
          notes
        )
      `,
      )
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id").eq("role", "admin"),
  ]);

  if (error) throw new Error(`Could not load members: ${error.message}`);
  if (rolesError) throw new Error(`Could not load member roles: ${rolesError.message}`);

  const safetyAdmins = new Set((roles ?? []).map((row) => row.user_id as string));

  return ((data ?? []) as ProfileRow[]).map((row) => {
    const { pilot_profiles: pilotRow, ...profile } = row;
    return {
      profile,
      pilot: normalisePilot(pilotRow),
      safetyAdmin: safetyAdmins.has(profile.id),
    };
  });
}

function normalisePilot(
  value: PilotProfile | PilotProfile[] | null,
): PilotProfile | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row ?? null;
}
