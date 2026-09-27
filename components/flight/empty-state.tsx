import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/flight/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty states are a feature, not a fallback. Each one says what happened,
 * why it's fine, and what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-primary/10 blur-2xl"
          aria-hidden
        />
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-card shadow-soft">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}
