import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  House,
  ListChecks,
  Megaphone,
  Plane,
  ScrollText,
  Settings,
  Tv,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import type { AppRole } from "@/lib/flight/types";

export type NavSection = "home" | "flying" | "safety" | "club";

/**
 * Who can see a nav item. This only controls visibility: every destination
 * enforces its own access on the server.
 *
 * - `public`: everyone, including signed-out visitors
 * - `member` / `instructor` / `admin`: minimum flight role
 * - `safety`: safety editors (`user_roles.admin`), including the briefing-room TV
 * - `club`: safety editors or flight admins
 */
export type NavAccess = "public" | AppRole | "safety" | "club";

export interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
  access: NavAccess;
  section: NavSection;
}

export interface NavAccessContext {
  role: AppRole | null;
  safetyAdmin: boolean;
}

export const NAV_SECTION_LABELS: Record<NavSection, string | null> = {
  home: null,
  flying: "Flying",
  safety: "Safety",
  club: "Club admin",
};

const SECTION_ORDER: NavSection[] = ["home", "flying", "safety", "club"];

export const AUTHORISE_NAV = {
  href: "/authorise",
  title: "Authorise a flight",
  icon: ClipboardCheck,
} as const;

export const APP_NAV: NavItem[] = [
  { href: "/", title: "Home", icon: House, access: "public", section: "home" },
  {
    href: "/fly",
    title: "My flights",
    icon: Plane,
    access: "member",
    section: "flying",
  },
  {
    href: "/fly/instructor",
    title: "Review queue",
    icon: ListChecks,
    access: "instructor",
    section: "flying",
  },
  {
    href: "/admin",
    title: "Manage articles",
    icon: Megaphone,
    access: "safety",
    section: "safety",
  },
  {
    href: "/tv",
    title: "Briefing room TV",
    icon: Tv,
    access: "safety",
    section: "safety",
  },
  {
    href: "/admin/fleet",
    title: "Fleet",
    icon: Plane,
    access: "admin",
    section: "club",
  },
  {
    href: "/admin/instructors",
    title: "Instructors",
    icon: Users,
    access: "admin",
    section: "club",
  },
  {
    href: "/admin/form-builder",
    title: "Form builder",
    icon: Wrench,
    access: "admin",
    section: "club",
  },
  {
    href: "/admin/settings",
    title: "Club settings",
    icon: Settings,
    access: "club",
    section: "club",
  },
  {
    href: "/admin/audit",
    title: "Audit log",
    icon: ScrollText,
    access: "admin",
    section: "club",
  },
];

export const PROFILE_NAV = {
  href: "/fly/profile",
  title: "Profile & currency",
  icon: UserRound,
} as const;

const ROLE_RANK: Record<AppRole, number> = {
  member: 0,
  instructor: 1,
  admin: 2,
};

export function canAccessNav(item: NavItem, access: NavAccessContext) {
  if (item.access === "public") return true;
  if (item.access === "club") return access.safetyAdmin || access.role === "admin";
  if (item.access === "safety") return access.safetyAdmin;
  if (!access.role) return false;
  return ROLE_RANK[access.role] >= ROLE_RANK[item.access];
}

export function navSections(access: NavAccessContext) {
  const items = APP_NAV.filter((item) => canAccessNav(item, access));
  return SECTION_ORDER.map((key) => ({
    key,
    label: NAV_SECTION_LABELS[key],
    items: items.filter((item) => item.section === key),
  })).filter((section) => section.items.length > 0);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/fly") return pathname === "/fly";
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/messages");
  }
  if (href === "/admin/settings") {
    return (
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/flight-settings")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title for the site header, taken from the nav item that owns the route. */
export function pageTitleFromPath(pathname: string): string {
  if (isNavActive(pathname, PROFILE_NAV.href)) return PROFILE_NAV.title;
  if (isNavActive(pathname, AUTHORISE_NAV.href)) return AUTHORISE_NAV.title;
  if (pathname === "/safety" || pathname.startsWith("/safety/")) return "Safety Hub";
  const item = APP_NAV.find((entry) => isNavActive(pathname, entry.href));
  return item?.title ?? "";
}
