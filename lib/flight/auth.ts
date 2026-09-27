import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createServerSupabase } from "@/lib/flight/supabase/server";
import type { AppRole, PilotProfile, Profile } from "@/lib/flight/types";

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
  pilot: PilotProfile | null;
}

/**
 * Resolve the current user + profile. Cached per request so a layout, a page
 * and three server components don't each hit the database.
 *
 * Identity is verified with `getClaims()` — when the project uses asymmetric
 * JWT signing keys this verifies locally via JWKS (no Auth round-trip). With
 * a legacy symmetric secret it falls back to the Auth server, same as
 * `getUser()`. We still load `profiles` / `pilot_profiles` from Postgres for
 * app role data that isn't in the JWT.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();

  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const { data: pilot } = await supabase
    .from("pilot_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  const claimEmail =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : null;

  return {
    id: userId,
    email: claimEmail ?? profile.email,
    profile: profile as Profile,
    pilot: (pilot as PilotProfile) ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

const ROLE_RANK: Record<AppRole, number> = {
  member: 0,
  instructor: 1,
  admin: 2,
};

export function hasRole(role: AppRole, minimum: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Gate a page or server action on a minimum role. Redirects rather than
 * throwing so a member who bookmarks /admin lands somewhere sensible.
 */
export async function requireRole(minimum: AppRole): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user.profile.role, minimum)) redirect("/fly");
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole("instructor");
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("admin");
}
