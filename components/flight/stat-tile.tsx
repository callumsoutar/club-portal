import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/flight/utils";
import { TONE_CLASSES, type Tone } from "@/lib/flight/constants";

interface StatTileProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  /** Small pill in the top-right corner — "Active", "Today", "Alert". */
  badge?: string;
  hint?: string;
  href?: string;
  /** Draws attention when the number is non-zero and needs action. */
  urgent?: boolean;
}

/**
 * Compact dashboard tile: icon chip top-left, context badge top-right,
 * uppercase label, big number. Six of these fit across a desktop row.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  badge,
  hint,
  href,
  urgent = false,
}: StatTileProps) {
  const isHot = urgent && Number(value) > 0;
  const toneClasses = TONE_CLASSES[tone];

  const content = (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-all duration-300",
        href && "hover:-translate-y-0.5 hover:shadow-lift",
        isHot && "ring-1 ring-inset",
        isHot && tone === "warning" && "ring-warning/35",
        isHot && tone === "danger" && "ring-destructive/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            toneClasses.soft,
          )}
        >
          <Icon className={cn("size-4", toneColour(tone))} strokeWidth={2.1} />
        </span>

        {badge && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
              isHot ? toneClasses.badge : "bg-secondary text-muted-foreground",
              isHot && "border-0",
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-[26px] leading-none font-semibold tracking-tight tabular-nums">
          {typeof value === "number" && value < 10 ? `0${value}` : value}
        </p>
        {hint && <p className="pt-1 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block h-full rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}

function toneColour(tone: Tone) {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning-foreground";
    case "danger":
      return "text-destructive";
    case "info":
      return "text-info";
    default:
      return "text-muted-foreground";
  }
}
