"use client";

import Link from "next/link";
import {
  CircleUserRoundIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/flight/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/flight/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/flight/ui/sidebar";
import { signOut } from "@/lib/flight/actions/profile";
import { initials } from "@/lib/flight/format";

export function NavUser({
  user,
  showProfile = true,
}: {
  user: {
    name: string;
    email: string;
  };
  showProfile?: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const fallback = initials(user.name || user.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-11 gap-2.5 rounded-lg px-1.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:rounded-lg"
            >
              <Avatar className="size-8 shrink-0 rounded-full group-data-[collapsible=icon]:size-7">
                <AvatarFallback className="rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {fallback}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-sidebar-accent-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-full">
                  <AvatarFallback className="rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {fallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {showProfile ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/fly/profile"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <CircleUserRoundIcon />
                      Profile & currency
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void signOut();
              }}
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
