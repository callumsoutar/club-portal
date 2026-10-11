"use client";

import Link from "next/link";
import { ChevronDownIcon, CircleUserRoundIcon, LogInIcon, LogOutIcon } from "lucide-react";

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
import { signOut } from "@/lib/flight/actions/profile";
import { initials } from "@/lib/flight/format";
import { PROFILE_NAV } from "@/lib/flight/nav";

/** Account menu at the right of the top bar. Signed-out visitors get a sign-in link. */
export function UserMenu({
  user,
  showProfile,
}: {
  user: { name: string; email: string } | null;
  showProfile: boolean;
}) {
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <LogInIcon className="size-4" strokeWidth={1.75} aria-hidden />
        Sign in
      </Link>
    );
  }

  const fallback = initials(user.name || user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-md py-1 pr-1.5 pl-1 transition-colors outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/70">
        <Avatar className="size-7 rounded-full">
          <AvatarFallback className="rounded-full bg-sidebar text-[11px] font-semibold text-white">
            {fallback}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[12rem] truncate text-sm font-medium text-foreground md:block">
          {user.name}
        </span>
        <ChevronDownIcon
          className="hidden size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block"
          aria-hidden
        />
        <span className="sr-only">Open account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-lg" align="end" sideOffset={6}>
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        {showProfile ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={PROFILE_NAV.href}>
                  <CircleUserRoundIcon />
                  {PROFILE_NAV.title}
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
  );
}
