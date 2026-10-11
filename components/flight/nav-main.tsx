"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/flight/ui/sidebar";
import { isNavActive, type NavItem, type NavSection } from "@/lib/flight/nav";

/** Nav row on the dark rail. Active rows get a lighter navy fill and white text. */
export const NAV_ITEM_CLASS =
  "h-8 gap-3 rounded-md px-2.5 text-[13.5px] font-normal text-sidebar-foreground [&_svg]:text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white hover:[&_svg]:text-white data-active:bg-sidebar-accent data-active:font-medium data-active:text-white data-active:[&_svg]:text-white group-data-[collapsible=icon]:rounded-md";

export function NavMain({
  sections,
}: {
  sections: {
    key: NavSection;
    label: string | null;
    items: NavItem[];
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      {sections.map((section, index) => (
        <SidebarGroup
          key={section.key}
          className={
            index === 0
              ? "px-2.5 pt-2 pb-3 group-data-[collapsible=icon]:px-2"
              : "px-2.5 py-3 group-data-[collapsible=icon]:px-2"
          }
        >
          {section.label ? (
            <SidebarGroupLabel className="mb-1 h-6 px-2.5 text-[12px] font-medium text-sidebar-foreground/55">
              {section.label}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavActive(pathname, item.href)}
                      tooltip={item.title}
                      className={NAV_ITEM_CLASS}
                    >
                      <Link href={item.href} onClick={closeOnMobile}>
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
      ))}
    </>
  );
}
