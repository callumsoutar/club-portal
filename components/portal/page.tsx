import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
} as const;

/** Content column for a portal page. Width follows the content, not the screen. */
export function Page({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8",
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary page actions, right-aligned on wide screens and full-width on phones. */
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-balance text-foreground sm:text-[1.75rem] sm:leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Heading for a block within a page, with an optional trailing link or count. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  as: Tag = "h2",
  className,
}: {
  /** Set when the surrounding section is labelled by this heading. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-0.5">
        <Tag id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </Tag>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

/** Quiet text link used for "View all" style actions. */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </Link>
  );
}
