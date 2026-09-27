import { cn } from "@/lib/flight/utils";
import { STATUS_META, TONE_CLASSES } from "@/lib/flight/constants";
import type { AuthorisationStatus } from "@/lib/flight/types";

interface StatusBadgeProps {
  status: AuthorisationStatus;
  size?: "sm" | "md";
  /** Adds a pulsing dot for statuses that are actively waiting on someone. */
  live?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const meta = STATUS_META[status];

  const pillClasses: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-info-muted text-info",
    success: "bg-success-muted text-success",
    warning: "bg-warning-muted text-warning-foreground",
    danger: "bg-danger-muted text-destructive",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        pillClasses[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
