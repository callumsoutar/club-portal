"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { HoverCard } from "radix-ui";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/flight/ui/sidebar";
import { isNavActive, isNavChildActive, type NavChild, type NavItem, type NavSection } from "@/lib/flight/nav";
import { cn } from "@/lib/flight/utils";

/** Nav row on the dark rail. Active rows get a lighter navy fill and white text. */
export const NAV_ITEM_CLASS =
  "h-8 gap-3 rounded-md px-2.5 text-[13.5px] font-normal text-sidebar-foreground [&_svg]:text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white hover:[&_svg]:text-white data-active:bg-sidebar-accent data-active:font-medium data-active:text-white data-active:[&_svg]:text-white group-data-[collapsible=icon]:rounded-md";

const FLYOUT_LINK_CLASS =
  "flex h-8 items-center rounded-md px-2.5 text-[13.5px] text-white/85 outline-none hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white data-[active=true]:bg-white/15 data-[active=true]:font-medium data-[active=true]:text-white";

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
                const active = isNavActive(pathname, item.href);
                const children = item.children ?? [];
                const link = (
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={children.length > 0 ? undefined : item.title}
                    className={NAV_ITEM_CLASS}
                  >
                    <Link href={item.href} onClick={closeOnMobile}>
                      <Icon strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {children.length > 0 && !isMobile ? (
                        <ChevronRight
                          className="ml-auto size-3.5 shrink-0 opacity-70 group-data-[collapsible=icon]:hidden"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                );

                return (
                  <SidebarMenuItem key={item.href}>
                    {children.length > 0 && !isMobile ? (
                      <NavFlyout item={item} pathname={pathname} onNavigate={closeOnMobile}>
                        {link}
                      </NavFlyout>
                    ) : (
                      link
                    )}
                    {isMobile && children.length > 0 ? (
                      <SidebarMenuSub>
                        {children.map((child) => (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isNavChildActive(pathname, child.href, item.href)}
                            >
                              <Link href={child.href} onClick={closeOnMobile}>
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
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

function NavFlyout({
  item,
  pathname,
  onNavigate,
  children,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  const links = item.children ?? [];

  return (
    <HoverCard.Root openDelay={80} closeDelay={160}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          align="start"
          sideOffset={10}
          collisionPadding={8}
          style={{ backgroundColor: "oklch(0.32 0.042 262)", borderColor: "oklch(0.48 0.04 262)" }}
          className="z-50 w-48 origin-(--radix-hover-card-content-transform-origin) rounded-lg border p-1.5 text-white shadow-lg outline-none data-[side=right]:slide-in-from-left-1 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        >
          <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-white/55">{item.title}</p>
          <ul className="flex flex-col">
            {links.map((child) => (
              <li key={child.href}>
                <FlyoutLink child={child} parentHref={item.href} pathname={pathname} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function FlyoutLink({
  child,
  parentHref,
  pathname,
  onNavigate,
}: {
  child: NavChild;
  parentHref: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isNavChildActive(pathname, child.href, parentHref);
  return (
    <Link
      href={child.href}
      onClick={onNavigate}
      data-active={active}
      className={cn(FLYOUT_LINK_CLASS)}
    >
      {child.title}
    </Link>
  );
}
