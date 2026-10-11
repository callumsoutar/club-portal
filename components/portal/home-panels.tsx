import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
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

import { SectionHeading } from "@/components/portal/page";
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
 * A block on the home page: a plain heading with the content beneath it.
 * `framed` puts the content on a bordered surface, which suits lists of
 * records; sidebar lists sit directly on the page background.
 */
export function HomeSection({
  id,
  title,
  description,
  action,
  framed = false,
  className,
  children,
}: {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  framed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <SectionHeading id={id} title={title} description={description} action={action} />
      {framed ? (
        <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex h-5 items-center rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
      New
    </span>
  );
}

/** Lead article with its image, followed by compact rows for the rest. */
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
        className="group grid gap-4 p-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:p-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-6"
      >
        <ArticleImage article={featured} className="aspect-[16/9] md:aspect-[4/3]" />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            {isNew(featured) ? <NewBadge /> : null}
            <ArticleMeta article={featured} />
          </div>
          <h3 className="mt-2 text-lg leading-snug font-semibold tracking-[-0.015em] text-pretty text-foreground group-hover:text-primary">
            {featured.title}
          </h3>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {featured.description}
          </p>
        </div>
      </Link>

      {rest.length > 0 ? (
        <ul className="divide-y divide-border/70 border-t border-border/70">
          {rest.map((article) => (
            <li key={article.slug}>
              <Link
                href={safetyArticleHref(article.slug)}
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <ArticleImage article={article} className="size-12 shrink-0 sm:h-12 sm:w-16" small />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[15px] leading-snug font-medium text-pretty text-foreground group-hover:text-primary">
                    {article.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isNew(article) ? <NewBadge /> : null}
                    <ArticleMeta article={article} />
                  </div>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary"
                  aria-hidden
                />
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
        className={cn("w-full rounded-lg bg-muted object-cover", className)}
      />
    );
  }

  const topic = CATEGORY_ART[article.category];
  const Icon = topic?.icon ?? Newspaper;
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full items-center justify-center rounded-lg",
        topic?.className ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className={small ? "size-5" : "size-8"} strokeWidth={1.5} />
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

const CURRENCY_TONES = {
  valid: { label: "Current", className: "text-success" },
  expiring: { label: "Due soon", className: "text-warning-foreground" },
  expired: { label: "Expired", className: "text-destructive" },
  unknown: { label: "Not set", className: "text-muted-foreground" },
} as const;

/** BFR and medical at a glance for the signed-in pilot. */
export function CurrencyList({ pilot }: { pilot: PilotProfile | null }) {
  const items = [
    { label: "Biennial flight review", value: pilot?.bfr_expiry },
    { label: "Medical certificate", value: pilot?.medical_expiry },
  ];

  return (
    <ul className="divide-y divide-border/70 border-y border-border/70">
      {items.map(({ label, value }) => {
        const info = getExpiryInfo(value);
        const tone = CURRENCY_TONES[info.state];
        return (
          <li key={label} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {value ? `Expires ${formatDate(value)}` : "Add the expiry date"}
                {info.state === "expiring" || info.state === "expired" ? ` · ${info.label}` : null}
              </p>
            </div>
            <span className={cn("shrink-0 text-xs font-medium", tone.className)}>{tone.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function TopicList({ topics }: { topics: { name: string; count: number }[] }) {
  return (
    <ul className="-mx-2">
      {topics.map((topic) => (
        <li key={topic.name}>
          <Link
            href={safetyCategoryHref(topic.name)}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CategoryDot category={topic.name} className="size-2" />
            <span className="min-w-0 flex-1 truncate text-foreground/90 group-hover:text-foreground">
              {topic.name}
            </span>
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

/** Destinations the signed-in user reaches for most, as a plain list. */
export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <ul className="divide-y divide-border/70 border-y border-border/70">
      {links.map(({ href, title, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon
              className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground/90 group-hover:text-foreground">
              {title}
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STEPS = [
  { title: "Fill in the form", body: "Choose your aircraft and add the details of your flight." },
  { title: "An instructor reviews it", body: "They approve it or follow up with you before you fly." },
  { title: "Track the decision", body: "Check the outcome from your phone using your tracking link." },
];

export function AuthorisationSteps() {
  return (
    <ol className="flex flex-col gap-4">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span className="mt-0.5 w-4 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
