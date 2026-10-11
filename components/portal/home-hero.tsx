import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface HeroAction {
  href: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Top of the portal home: the club name as a small caps label, the page
 * title, and the one or two things the visitor most likely came to do.
 */
export function HomeHeader({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  primary: HeroAction;
  secondary?: HeroAction;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1
          id="home-title"
          className="mt-1.5 text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-foreground"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row-reverse">
        <HeaderLink action={primary} primary />
        {secondary ? <HeaderLink action={secondary} /> : null}
      </div>
    </header>
  );
}

function HeaderLink({ action, primary = false }: { action: HeroAction; primary?: boolean }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border bg-card text-foreground hover:bg-muted/60",
      )}
    >
      {Icon ? <Icon className="size-4" strokeWidth={1.75} aria-hidden /> : null}
      {action.label}
    </Link>
  );
}
