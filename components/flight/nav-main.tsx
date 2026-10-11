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
import {
  AUTHORISE_NAV,
  isNavActive,
  type NavItem,
  type NavSection,
} from "@/lib/flight/nav";
import { cn } from "@/lib/flight/utils";

/** Nav row. Active rows lift onto a white surface rather than tinting. */
export const NAV_ITEM_CLASS =
  "h-9 gap-2.5 rounded-lg px-2.5 text-[13.5px] text-sidebar-foreground/85 [&_svg]:text-muted-foreground hover:text-foreground hover:[&_svg]:text-foreground data-active:bg-card data-active:text-foreground data-active:shadow-[0_1px_2px_oklch(0.2_0.03_250/0.06),0_0_0_1px_var(--sidebar-border)] data-active:[&_svg]:text-primary group-data-[collapsible=icon]:rounded-lg";

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
  const AuthoriseIcon = AUTHORISE_NAV.icon;
  const authoriseActive = isNavActive(pathname, AUTHORISE_NAV.href);

  return (
    <>
      <SidebarGroup className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:px-2">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={authoriseActive}
                tooltip={AUTHORISE_NAV.title}
                className={cn(
                  "h-10 justify-center gap-2 rounded-lg bg-primary px-3 font-medium text-primary-foreground shadow-[0_1px_2px_oklch(0.2_0.1_258/0.2),inset_0_1px_0_oklch(1_0_0/0.12)] transition-colors",
                  "hover:bg-primary/92 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground",
                  "data-active:bg-primary data-active:text-primary-foreground",
                  "group-data-[collapsible=icon]:rounded-lg",
                )}
              >
                <Link href={AUTHORISE_NAV.href} onClick={closeOnMobile}>
                  <AuthoriseIcon className="text-primary-foreground" />
                  <span>{AUTHORISE_NAV.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {sections.map((section) => (
        <SidebarGroup key={section.key} className="px-3 py-1.5 group-data-[collapsible=icon]:px-2">
          {section.label ? (
            <SidebarGroupLabel className="h-7 px-2.5 text-[11px] font-medium tracking-[0.06em] text-muted-foreground/80 uppercase">
              {section.label}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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
