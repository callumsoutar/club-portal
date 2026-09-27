import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  House,
  LayoutDashboard,
  Megaphone,
  Plane,
  PlusCircle,
  ScrollText,
  Settings,
  Tv,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import type { AppRole } from "@/lib/flight/types";

export type NavSection = "fly" | "authorisations" | "safety" | "club";
export type NavAccess = AppRole | "safety" | "club" | "any";

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

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  fly: "Flying",
  authorisations: "Authorisations",
  safety: "Safety",
  club: "Club",
};

export const APP_NAV: NavItem[] = [
  {
    href: "/fly",
    title: "My flights",
    icon: LayoutDashboard,
    access: "member",
    section: "fly",
  },
  {
    href: "/authorise",
    title: "New authorisation",
    icon: PlusCircle,
    access: "member",
    section: "fly",
  },
  {
    href: "/fly/instructor",
    title: "Authorisations",
    icon: ClipboardList,
    access: "instructor",
    section: "authorisations",
  },
  {
    href: "/",
    title: "Safety Hub",
    icon: House,
    access: "any",
    section: "safety",
  },
  {
    href: "/admin",
    title: "Messages",
    icon: Megaphone,
    access: "safety",
    section: "safety",
  },
  {
    href: "/tv",
    title: "TV display",
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
  if (item.access === "any") return Boolean(access.role) || access.safetyAdmin;
  if (item.access === "club") return access.safetyAdmin || access.role === "admin";
  if (item.access === "safety") return access.safetyAdmin;
  if (!access.role) return false;
  return ROLE_RANK[access.role] >= ROLE_RANK[item.access];
}

export function navForAccess(access: NavAccessContext) {
  return APP_NAV.filter((item) => canAccessNav(item, access));
}

export function navSections(access: NavAccessContext) {
  const items = navForAccess(access);
  return (["fly", "authorisations", "safety", "club"] as const)
    .map((key) => ({
      key,
      label: NAV_SECTION_LABELS[key],
      items: items.filter((item) => item.section === key),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/fly/instructor") {
    return (
      pathname === "/fly/instructor" ||
      pathname.startsWith("/fly/instructor/queue") ||
      pathname.startsWith("/fly/instructor/authorisations/")
    );
  }
  if (href === "/fly") return pathname === "/fly";
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/messages");
  }
  if (href === "/tv") return pathname === "/tv" || pathname.startsWith("/tv?");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Compact title for the site header, derived from the current route. */
export function pageTitleFromPath(pathname: string): string {
  if (pathname.startsWith("/fly/instructor/authorisations/")) return "Review";
  if (pathname.startsWith("/fly/instructor")) return "Authorisations";
  if (pathname.startsWith("/admin/messages")) return "Messages";
  if (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/flight-settings")) {
    return "Club settings";
  }
  if (pathname.startsWith("/admin/fleet")) return "Fleet";
  if (pathname.startsWith("/admin/instructors")) return "Instructors";
  if (pathname.startsWith("/admin/form-builder")) return "Form builder";
  if (pathname.startsWith("/admin/audit")) return "Audit log";
  if (pathname === "/admin") return "Messages";
  if (pathname.startsWith("/fly/profile")) return "Profile";
  if (pathname.startsWith("/fly")) return "My flights";
  return "FlightAuth";
}
