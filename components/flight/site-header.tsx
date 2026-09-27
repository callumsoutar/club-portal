"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Separator } from "@/components/flight/ui/separator";
import { SidebarTrigger } from "@/components/flight/ui/sidebar";
import { pageTitleFromPath } from "@/lib/flight/nav";
import type { AppRole } from "@/lib/flight/types";

export function SiteHeader({ role }: { role: AppRole | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitleFromPath(pathname);
  const isStaff = role === "instructor" || role === "admin";

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:border-border/70 md:bg-background/90 md:text-foreground md:backdrop-blur-md">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:text-foreground/70 md:hover:bg-muted md:hover:text-foreground" />
        <Separator
          orientation="vertical"
          className="mx-1 hidden h-4 bg-sidebar-border sm:block data-[orientation=vertical]:h-4 md:bg-border"
        />
        <h1 className="truncate text-sm font-medium text-sidebar-foreground md:text-foreground">
          {title}
        </h1>

        {isStaff && (
          <div className="relative ml-4 hidden min-w-0 flex-1 md:block md:max-w-sm lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-foreground/40" />
            <input
              type="search"
              placeholder="Search pilots, tail numbers…"
              className="h-8 w-full rounded-lg border border-border/80 bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value.trim();
                  router.push(
                    `/fly/instructor?status=all&q=${encodeURIComponent(value)}`,
                  );
                }
              }}
              aria-label="Search authorisations"
            />
          </div>
        )}
      </div>
    </header>
  );
}
