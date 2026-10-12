import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  CloudSun,
  Cog,
  Compass,
  Fuel,
  ListChecks,
  Newspaper,
  PlaneLanding,
  Radio,
  Siren,
} from "lucide-react";

import { ArticleMeta, CategoryDot } from "@/components/safety/article-row";
import { formatDate, getExpiryInfo } from "@/lib/flight/format";
import type { PilotProfile } from "@/lib/flight/types";
import {
  safetyArticleHref,
  safetyCategoryHref,
  type SafetyArticleSummary,
} from "@/lib/safety-messages";
import { cn } from "@/lib/utils";

/**
 * A block on the home page. Main content sits on a white sheet so it stands
 * off the grey page; side sections use a small-caps label and no surface.
 */
export function Section({
  id,
  title,
  meta,
  action,
  variant = "sheet",
  className,
  children,
}: {
  id: string;
  title: React.ReactNode;
  /** Count shown beside the title. */
  meta?: React.ReactNode;
  action?: { href: string; label: string };
  variant?: "sheet" | "aside";
  className?: string;
  children: React.ReactNode;
}) {
  const sheet = variant === "sheet";
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0",
        sheet &&
          "rounded-xl bg-card px-5 pt-4 pb-1.5 shadow-[0_1px_2px_oklch(0.2_0.03_255/0.05),0_0_0_1px_oklch(0.2_0.03_255/0.05)] sm:px-6 sm:pt-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4",
          sheet ? "border-b pb-3.5" : "border-b border-foreground/10 pb-2",
        )}
      >
        <h2
          id={id}
          className={cn(
            "flex min-w-0 items-center gap-2",
            sheet
              ? "text-[15px] font-semibold tracking-[-0.01em] text-foreground"
              : "text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase",
          )}
        >
          <span className="truncate">{title}</span>
          {meta ? (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
              {meta}
            </span>
          ) : null}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="group inline-flex shrink-0 items-center gap-1 rounded-sm text-[13px] font-medium text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {action.label}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** One quiet line for a section with nothing in it. */
export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-5 text-sm text-muted-foreground">{children}</p>;
}

/** Rows of records (authorisations) that line up with the section heading. */
export function RecordList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="-mx-4 divide-y divide-border/70 [&_a]:rounded-md">{children}</ul>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-sm bg-primary px-1.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
      New
    </span>
  );
}

/** The lead article large, the next few in a two-column list beneath it. */
export function SafetyFeed({
  featured,
  rest,
  isNew,
}: {
  featured: SafetyArticleSummary;
  rest: SafetyArticleSummary[];
  isNew: (article: SafetyArticleSummary) => boolean;
}) {
  return (
    <div>
      <Link
        href={safetyArticleHref(featured.slug)}
        className="group grid gap-5 rounded-md py-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:outline-none md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-8"
      >
        <ArticleImage
          article={featured}
          className="aspect-[3/2] transition-opacity group-hover:opacity-95"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isNew(featured) ? <NewBadge /> : null}
            <ArticleMeta article={featured} />
          </div>
          <h3 className="mt-3 text-xl leading-snug font-semibold tracking-[-0.02em] text-pretty text-foreground group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4 sm:text-[1.375rem]">
            {featured.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">
            {featured.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Read article
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Link>

      {rest.length > 0 ? (
        <ul className="grid border-t md:grid-cols-2 md:gap-x-8">
          {rest.map((article) => (
            <li
              key={article.slug}
              className="border-b border-border/70 last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
            >
              <Link
                href={safetyArticleHref(article.slug)}
                className="group flex items-center gap-3.5 rounded-md py-3.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ArticleImage article={article} className="size-12 shrink-0" small />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm leading-snug font-medium text-foreground group-hover:text-primary">
                    {article.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isNew(article) ? <NewBadge /> : null}
                    <ArticleMeta article={article} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ArticleImage({
  article,
  className,
  small = false,
}: {
  article: SafetyArticleSummary;
  className?: string;
  small?: boolean;
}) {
  if (article.imageUrl) {
    return (
      <img
        src={article.imageUrl}
        alt={small ? "" : article.imageAlt}
        loading={small ? "lazy" : undefined}
        className={cn("w-full rounded-md bg-muted object-cover", className)}
      />
    );
  }

  const topic = CATEGORY_ART[article.category];
  const Icon = topic?.icon ?? Newspaper;
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full items-center justify-center rounded-md",
        topic?.className ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className={small ? "size-5" : "size-10"} strokeWidth={1.5} />
    </div>
  );
}

const CATEGORY_ART: Record<string, { icon: LucideIcon; className: string }> = {
  "Aerodrome & Circuit": { icon: PlaneLanding, className: "bg-sky-50 text-sky-600" },
  "Aircraft & Engine": { icon: Cog, className: "bg-slate-100 text-slate-600" },
  Airmanship: { icon: Compass, className: "bg-blue-50 text-blue-600" },
  "Airspace & Radio": { icon: Radio, className: "bg-violet-50 text-violet-600" },
  Emergencies: { icon: Siren, className: "bg-red-50 text-red-600" },
  "Ground Ops": { icon: Fuel, className: "bg-amber-50 text-amber-600" },
  "Human Factors": { icon: Brain, className: "bg-pink-50 text-pink-600" },
  "Procedures & SOPs": { icon: ListChecks, className: "bg-teal-50 text-teal-700" },
  Weather: { icon: CloudSun, className: "bg-cyan-50 text-cyan-700" },
};

const DAYS_TONE = {
  valid: "text-foreground",
  expiring: "font-medium text-warning-foreground",
  expired: "font-medium text-destructive",
  unknown: "text-muted-foreground",
} as const;

/** Medical and BFR: when each expires and how many days are left. */
export function ReminderList({ pilot }: { pilot: PilotProfile | null }) {
  const rows = [
    { label: "Medical", value: pilot?.medical_expiry },
    { label: "BFR", value: pilot?.bfr_expiry },
  ];

  return (
    <ul className="divide-y divide-border/70">
      {rows.map(({ label, value }) => {
        const info = getExpiryInfo(value);
        return (
          <li key={label} className="flex items-baseline justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[12.5px] text-muted-foreground tabular-nums">
                {value ? `Expires ${formatDate(value)}` : "Add the expiry date"}
              </p>
            </div>
            <p className={cn("shrink-0 text-sm tabular-nums", DAYS_TONE[info.state])}>
              {info.days === null
                ? "Not set"
                : info.days < 0
                  ? "Expired"
                  : `${info.days} ${info.days === 1 ? "day" : "days"}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Topics as small pills that wrap, each linking to its filtered list. */
export function TopicPills({ topics }: { topics: { name: string; count: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5 pt-3.5">
      {topics.map((topic) => (
        <li key={topic.name}>
          <Link
            href={safetyCategoryHref(topic.name)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-card px-2.5 text-[13px] text-foreground/85 shadow-[0_0_0_1px_oklch(0.2_0.03_255/0.08)] transition-colors hover:text-foreground hover:shadow-[0_0_0_1px_oklch(0.2_0.03_255/0.2)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CategoryDot category={topic.name} />
            {topic.name}
            <span className="text-xs text-muted-foreground tabular-nums">{topic.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface QuickLink {
  href: string;
  title: string;
  icon: LucideIcon;
}

/** Destinations the signed-in user reaches for most. */
export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <ul className="divide-y divide-border/70">
      {links.map(({ href, title, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group flex items-center gap-3 rounded-sm py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon
              className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-foreground group-hover:text-primary">
              {title}
            </span>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
