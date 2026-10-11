"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/flight/ui/sidebar";
import { NAV_ITEM_CLASS } from "@/components/flight/nav-main";
import { isNavActive } from "@/lib/flight/nav";
import { cn } from "@/lib/flight/utils";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    href: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup {...props} className={cn("px-3 py-2 group-data-[collapsible=icon]:px-2", props.className)}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isNavActive(pathname, item.href)}
                  tooltip={item.title}
                  className={NAV_ITEM_CLASS}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <Icon strokeWidth={1.75} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
