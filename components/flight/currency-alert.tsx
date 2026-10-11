import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { getExpiryInfo } from "@/lib/flight/format";
import type { PilotProfile } from "@/lib/flight/types";
import { cn } from "@/lib/flight/utils";

/**
 * BFR / medical warning for the signed-in pilot. Renders nothing while both
 * are current, so it can sit at the top of any page.
 */
export function CurrencyAlert({ pilot }: { pilot: PilotProfile | null }) {
  const warnings = [
    { label: "BFR", info: getExpiryInfo(pilot?.bfr_expiry) },
    { label: "Medical", info: getExpiryInfo(pilot?.medical_expiry) },
  ].filter((w) => w.info.state === "expired" || w.info.state === "expiring");

  if (warnings.length === 0) return null;

  const hasExpired = warnings.some((w) => w.info.state === "expired");
  const detail =
    warnings.length === 1
      ? `${hasExpired ? "expired" : "expires soon"}: ${warnings[0]!.info.label}`
      : hasExpired
        ? "need attention before you fly"
        : "expire soon";

  return (
    <Link
      href="/fly/profile"
      role="alert"
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        hasExpired
          ? "border-destructive/25 bg-danger-muted text-destructive hover:bg-danger-muted/70"
          : "border-warning/30 bg-warning-muted text-warning-foreground hover:bg-warning-muted/70",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 leading-snug">
          <span className="font-medium">
            {warnings.map((w) => w.label).join(" and ")}
          </span>{" "}
          <span className="opacity-85">{detail}</span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium">
        Update
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
