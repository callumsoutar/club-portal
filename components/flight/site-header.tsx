"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/flight/ui/separator";
import { SidebarTrigger } from "@/components/flight/ui/sidebar";
import { pageTitleFromPath } from "@/lib/flight/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const title = pageTitleFromPath(pathname);

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
      </div>
    </header>
  );
}
