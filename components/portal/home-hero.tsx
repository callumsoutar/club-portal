import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface HeroAction {
  href: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Welcome band at the top of the portal home. Compact on purpose: the date,
 * a greeting, one line of context and the one or two things the visitor is
 * most likely here to do. Everything else lives in the page below.
 */
export function HomeHero({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primary: HeroAction;
  secondary?: HeroAction;
}) {
  return (
    <section
      aria-labelledby="home-title"
      className="rounded-xl bg-[oklch(0.3_0.07_258)] text-white ring-1 ring-white/10 ring-inset"
    >
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[13px] font-medium text-white/60 tabular-nums">{eyebrow}</p>
          <h1
            id="home-title"
            className="mt-2 text-[1.625rem] leading-tight font-semibold tracking-[-0.022em] text-balance sm:text-3xl"
          >
            {title}
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-pretty text-white/72 sm:text-base">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <HeroLink action={primary} tone="primary" />
          {secondary ? <HeroLink action={secondary} tone="secondary" /> : null}
        </div>
      </div>
    </section>
  );
}

function HeroLink({ action, tone }: { action: HeroAction; tone: "primary" | "secondary" }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={
        tone === "primary"
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[oklch(0.3_0.07_258)] transition-colors hover:bg-white/90 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white ring-1 ring-white/25 transition-colors ring-inset hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none"
      }
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {action.label}
    </Link>
  );
}
