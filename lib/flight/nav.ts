import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  House,
  ListChecks,
  Megaphone,
  Plane,
  Radar,
  Settings,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import { hasPermission, type Permission } from "@/lib/flight/permissions";
import type { AppRole } from "@/lib/flight/types";

export type NavSection = "home" | "flying" | "safety" | "club";

/**
 * Who can see a nav item. Visibility only: every destination enforces access
 * on the server. `canAccessNav` checks the permission catalog, not this label.
 *
 * - `public`: everyone, including signed-out visitors
 * - `member` / `instructor` / `admin`: minimum flight role described by the item
 * - `safety`: safety editors (`user_roles.admin`)
 * - `club`: safety editors or flight admins
 */
export type NavAccess = "public" | AppRole | "safety" | "club";

export interface NavChild {
  href: string;
  title: string;
  /** Hidden from instructors. The parent route still enforces access. */
  admin?: boolean;
}

export interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
  access: NavAccess;
  section: NavSection;
  /** Extra visibility rule on top of the role check. */
  when?: "training-student";
  children?: NavChild[];
}

export interface NavAccessContext {
  role: AppRole | null;
  safetyAdmin: boolean;
  trainingStudent?: boolean;
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
  { ...AUTHORISE_NAV, access: "public", section: "home" },
  { href: "/safety", title: "Safety Hub", icon: BookOpen, access: "public", section: "home" },
  {
    href: "/training/enrolments",
    title: "Training",
    icon: GraduationCap,
    access: "instructor",
    section: "home",
    children: [
      { href: "/training/enrolments", title: "Training" },
      { href: "/training", title: "C Cat" },
      { href: "/training/flights", title: "Flight log" },
      { href: "/training/questions", title: "POF questions" },
    ],
  },
  {
    href: "/training/me",
    title: "My training",
    icon: GraduationCap,
    access: "member",
    section: "home",
    when: "training-student",
  },
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
    href: "/traffic",
    title: "Traffic",
    icon: Radar,
    access: "admin",
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
    href: "/admin/members",
    title: "Members",
    icon: UserRound,
    access: "club",
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
];

export const PROFILE_NAV = {
  href: "/fly/profile",
  title: "Profile & currency",
  icon: UserRound,
} as const;

/** Href to permission. Public routes are omitted. */
const NAV_PERMISSION: Record<string, Permission> = {
  "/training": "training.record",
  "/training/enrolments": "training.record",
  "/training/me": "flights.read",
  "/fly": "flights.read",
  "/fly/instructor": "authorisations.review",
  "/traffic": "traffic.read",
  "/admin": "safety.manage",
  "/admin/fleet": "fleet.manage",
  "/admin/instructors": "instructors.manage",
  "/admin/members": "members.manage",
  "/admin/form-builder": "forms.manage",
  "/admin/settings": "club.settings",
};

export function canAccessNav(item: NavItem, access: NavAccessContext) {
  if (item.when === "training-student" && !access.trainingStudent) return false;
  if (item.access === "public") return true;
  const permission = NAV_PERMISSION[item.href];
  if (!permission) return false;
  return hasPermission(
    { flightRole: access.role, safetyAdmin: access.safetyAdmin },
    permission,
  );
}

export function navSections(access: NavAccessContext) {
  const items = APP_NAV.filter((item) => canAccessNav(item, access)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => !child.admin || access.role === "admin"),
  }));
  return SECTION_ORDER.map((key) => ({
    key,
    label: NAV_SECTION_LABELS[key],
    items: items.filter((item) => item.section === key),
  })).filter((section) => section.items.length > 0);
}

/** Which training submenu row is current. C Cat also covers a student's C Cat record. */
export function isNavChildActive(pathname: string, href: string, parentHref: string) {
  if (href === "/training/enrolments") {
    return pathname === "/training/enrolments" || pathname.startsWith("/training/enrolments/");
  }
  if (href === "/training") {
    return pathname === "/training" || pathname.startsWith("/training/students");
  }
  if (href === parentHref) {
    return pathname === parentHref || pathname.startsWith(`${parentHref}/students`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/fly") return pathname === "/fly";
  if (href === "/fly/instructor") {
    return pathname === "/fly/instructor" || pathname.startsWith("/fly/instructor/authorisations");
  }
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/messages");
  }
  if (href === "/training/enrolments") {
    return pathname === "/training" || (pathname.startsWith("/training/") && !pathname.startsWith("/training/me"));
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
  for (const item of APP_NAV) {
    const child = item.children?.find((entry) => isNavChildActive(pathname, entry.href, item.href));
    if (child && isNavActive(pathname, item.href)) return child.title;
  }
  const item = APP_NAV.find((entry) => isNavActive(pathname, entry.href));
  return item?.title ?? "";
}
