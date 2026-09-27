import Link from "next/link";

import { StatusBadge } from "@/components/flight/status-badge";
import {
  formatDate,
  formatRelative,
  getAuthorisationFormName,
} from "@/lib/flight/format";
import type { AuthorisationWithRelations } from "@/lib/flight/types";

interface AuthorisationCardProps {
  authorisation: AuthorisationWithRelations;
  href: string;
  /** Instructors need to see who's flying; pilots already know. */
  showPilot?: boolean;
  /** Dense row for history lists. */
  compact?: boolean;
}

/**
 * Shared flight authorisation row — used on the pilot dashboard and the
 * instructor queue. Dense, scannable, no decorative chrome.
 */
export function AuthorisationCard({
  authorisation: a,
  href,
  showPilot = false,
  compact = false,
}: AuthorisationCardProps) {
  const registration =
    a.aircraft?.registration ?? a.aircraft_registration ?? "Aircraft TBC";
  const aircraftType = a.aircraft?.aircraft_type;
  const exercise = a.exercise?.trim() || "No exercise recorded";
  const formName = getAuthorisationFormName(a.template_snapshot);

  const scheduleParts: string[] = [];
  if (a.flight_date) scheduleParts.push(formatDate(a.flight_date, "d MMM"));
  else if (a.submitted_at) scheduleParts.push(formatRelative(a.submitted_at));

  // Only show destination when it adds information beyond the exercise.
  const destination =
    a.destination &&
    a.destination.trim().toLowerCase() !== exercise.toLowerCase()
      ? a.destination.trim()
      : null;

  if (compact) {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-sm font-medium">{registration}</span>
            {aircraftType ? (
              <span className="text-sm text-muted-foreground">{aircraftType}</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {formName}
            {" · "}
            {exercise}
            {a.flight_date
              ? ` · ${formatDate(a.flight_date, "d MMM yyyy")}`
              : null}
          </p>
        </div>
        <StatusBadge status={a.status} size="sm" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto_auto] sm:gap-5"
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium">{registration}</p>
        <p className="truncate text-xs text-muted-foreground">
          {showPilot ? a.pilot_name : (aircraftType ?? "Type not set")}
        </p>
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate text-sm font-medium">{formName}</p>
        <p className="truncate text-xs text-muted-foreground">{exercise}</p>
        {destination ? (
          <p className="truncate text-xs text-muted-foreground">{destination}</p>
        ) : null}
        {showPilot && aircraftType ? (
          <p className="truncate text-xs text-muted-foreground sm:hidden">
            {aircraftType}
          </p>
        ) : null}
      </div>

      <p className="col-span-2 text-sm text-muted-foreground sm:col-span-1 sm:whitespace-nowrap">
        {scheduleParts.join(" · ") || "—"}
      </p>

      <div className="row-start-1 justify-self-end sm:row-start-auto">
        <StatusBadge status={a.status} size="sm" live />
      </div>
    </Link>
  );
}
