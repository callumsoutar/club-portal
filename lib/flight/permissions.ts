import type { AppRole } from "@/lib/flight/types";

/**
 * Capabilities derived from the two role stores. This list is the application
 * source of truth and must match `public.has_permission` in
 * `supabase/migrations/20261027103000_lock_profile_privileges_and_permissions.sql`.
 *
 * Roles are not checked at call sites. Ask for a permission instead.
 */
export const PERMISSIONS = [
  "flights.read",
  "profile.update",
  "authorisations.review",
  "authorisations.approve",
  "authorisations.archive",
  "training.record",
  "training.manage",
  "fleet.manage",
  "instructors.manage",
  "forms.manage",
  "members.manage",
  "club.settings",
  "safety.manage",
  "briefing.tv",
  "traffic.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Who is asking. `flightRole` is null when there is no flight profile. */
export interface AccessSubject {
  flightRole: AppRole | null;
  safetyAdmin: boolean;
}

const ROLE_RANK: Record<AppRole, number> = {
  member: 0,
  instructor: 1,
  admin: 2,
};

function atLeast(role: AppRole | null, minimum: AppRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * Default is deny. Safety admin does not imply a flight role, and a flight
 * admin does not imply safety admin.
 */
export function hasPermission(subject: AccessSubject, permission: Permission): boolean {
  switch (permission) {
    case "flights.read":
    case "profile.update":
      return atLeast(subject.flightRole, "member");
    case "authorisations.review":
    case "authorisations.approve":
    case "training.record":
      return atLeast(subject.flightRole, "instructor");
    case "authorisations.archive":
    case "training.manage":
    case "fleet.manage":
    case "instructors.manage":
    case "forms.manage":
    case "traffic.read":
      return atLeast(subject.flightRole, "admin");
    case "members.manage":
    case "club.settings":
      return atLeast(subject.flightRole, "admin") || subject.safetyAdmin;
    case "safety.manage":
    case "briefing.tv":
      return subject.safetyAdmin;
    default: {
      const _unhandled: never = permission;
      void _unhandled;
      return false;
    }
  }
}
