"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlusIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/flight/ui/sidebar";
import { isNavActive, type NavItem, type NavSection } from "@/lib/flight/nav";

export function NavMain({
  sections,
  canAuthorise,
}: {
  sections: {
    key: NavSection;
    label: string;
    items: NavItem[];
  }[];
  canAuthorise: boolean;
}) {
  const pathname = usePathname();
  const showLabels = sections.length > 1;

  return (
    <>
      {canAuthorise ? (
        <SidebarGroup className="pb-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New authorisation"
                  className="min-w-8 border border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground"
                >
                  <Link href="/authorise">
                    <CirclePlusIcon />
                    <span>New authorisation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}

      {sections.map((section) => (
        <SidebarGroup key={section.key}>
          {showLabels && (
            <SidebarGroupLabel className="text-sidebar-foreground/45">
              {section.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items
                .filter((item) => item.href !== "/authorise")
                .map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="text-sidebar-foreground/75 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
