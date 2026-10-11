"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/flight/ui/separator";
import { SidebarTrigger } from "@/components/flight/ui/sidebar";
import { pageTitleFromPath } from "@/lib/flight/nav";

export function SiteHeader({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const title = pageTitleFromPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex w-full min-w-0 items-center gap-2 px-3 sm:px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 size-9 text-muted-foreground hover:text-foreground md:size-8" />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <p className="truncate text-sm font-medium">{title || companyName}</p>
      </div>
    </header>
  );
}
