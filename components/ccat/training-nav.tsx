"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/flight/types";

const LINKS = [
  { href: "/training", label: "Overview", admin: false },
  { href: "/training/flights", label: "Flight log", admin: false },
  { href: "/training/planner", label: "Planner", admin: false },
  { href: "/training/syllabus", label: "Syllabus", admin: true },
  { href: "/training/import", label: "Import", admin: true },
];

export function TrainingNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  if (pathname.startsWith("/training/me")) return null;
  const links = LINKS.filter((link) => !link.admin || role === "admin");

  return (
    <nav className="mx-auto -mt-2 flex w-full max-w-6xl gap-1 overflow-x-auto px-4 print:hidden sm:px-6 lg:px-8" aria-label="Training">
      {links.map((link) => {
        const active = link.href === "/training" ? pathname === "/training" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
