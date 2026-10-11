import { notFound } from "next/navigation";
import Link from "next/link";

import { StatusBadge } from "@/components/flight/status-badge";
import { Logo } from "@/components/flight/logo";
import { STATUS_META } from "@/lib/flight/constants";
import { getSessionUser } from "@/lib/flight/auth";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  getAuthorisationFormName,
} from "@/lib/flight/format";
import {
  getActivity,
  getAuthorisationByToken,
} from "@/lib/flight/queries";
import { getCompanySettings } from "@/lib/get-company-settings";
import { cn } from "@/lib/flight/utils";
import type { AuthorisationStatus } from "@/lib/flight/types";

export const metadata = {
  title: "Your authorisation",
  robots: { index: false },
};

/**
 * Guest / member tracking page via unguessable token.
 * Shows only this flight — no club navigation.
 */
export default async function GuestAuthorisationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const [authorisation, user, company] = await Promise.all([
    getAuthorisationByToken(token),
    getSessionUser(),
    getCompanySettings(),
  ]);
  if (!authorisation) notFound();

  const activity = await getActivity(authorisation.id);
  const meta = STATUS_META[authorisation.status];
  const formName = getAuthorisationFormName(authorisation.template_snapshot);
  const registration = authorisation.aircraft_registration ?? "—";
  const isWaiting =
    authorisation.status === "submitted" || authorisation.status === "pending";
  const accent = statusAccent(authorisation.status);

  const showDestination =
    Boolean(authorisation.destination) &&
    authorisation.destination !== authorisation.exercise;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-5">
          <Link href="/" aria-label={`${company.companyName} home`} className="min-w-0">
            <Logo companyName={company.companyName} clubLogoUrl={company.logoUrl} />
          </Link>
          <StatusBadge status={authorisation.status} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-8">
        {/* Status hero */}
        <section>
          <div className={cn("mb-5 h-1 w-12 rounded-full", accent.bar)} />

          <p className="font-mono text-[12px] tracking-wide text-muted-foreground">
            {authorisation.reference}
          </p>

          <h1 className="mt-2 text-[2rem] leading-[1.1] font-semibold tracking-[-0.035em] text-foreground sm:text-[2.25rem]">
            {meta.label}
          </h1>

          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {statusMessage(authorisation.status)}
          </p>
        </section>

        {/* Aircraft summary */}
        <section className="mt-8 rounded-xl border border-border bg-card px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Aircraft
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground">
                {registration}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{formName}</p>
            </div>
            {isWaiting ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-info-muted px-2.5 py-1 text-[11px] font-medium text-info">
                <span className="size-1.5 animate-pulse rounded-full bg-info" />
                Awaiting review
              </span>
            ) : null}
          </div>
        </section>

        {/* Flight details */}
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Flight details
          </h2>

          <dl className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            <DetailRow label="Pilot" value={authorisation.pilot_name} />
            <DetailRow
              label="Date"
              value={formatDate(authorisation.flight_date)}
            />
            <DetailRow
              label="Exercise"
              value={authorisation.exercise ?? "—"}
            />
            {showDestination ? (
              <DetailRow
                label="Destination"
                value={authorisation.destination!}
              />
            ) : null}
            {authorisation.return_eta ? (
              <DetailRow
                label="Return / SAR"
                value={formatDateTime(authorisation.return_eta)}
              />
            ) : null}
            {authorisation.passenger_names ? (
              <DetailRow
                label="Passengers"
                value={authorisation.passenger_names}
              />
            ) : null}
          </dl>
        </section>

        {/* Activity */}
        {activity.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Updates
            </h2>

            <ol className="relative mt-4 space-y-0 border-l border-border ml-1.5">
              {activity.map((entry, index) => (
                <li key={entry.id} className="relative pl-5 pb-5 last:pb-0">
                  <span
                    className={cn(
                      "absolute top-1.5 -left-[5px] size-2.5 rounded-full ring-4 ring-background",
                      index === 0 ? accent.dot : "bg-border",
                    )}
                  />
                  <p className="text-[15px] leading-snug font-medium text-foreground">
                    {entry.summary}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelative(entry.created_at)}
                    {entry.actor_label ? ` · ${entry.actor_label}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Footer action — full-width on phones for easier tapping */}
        <div className="mt-8 border-t border-border/70 pt-6 pb-2">
          {user ? (
            <Link
              href="/fly"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-muted/60 sm:w-auto sm:px-5"
            >
              Back to my flights
            </Link>
          ) : (
            <Link
              href="/authorise"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-muted/60 sm:w-auto sm:px-5"
            >
              {isWaiting ? "Submit another" : "Start another authorisation"}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-6 sm:px-5">
      <dt className="w-28 shrink-0 text-[13px] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-[15px] font-medium break-words text-foreground">
        {value}
      </dd>
    </div>
  );
}

function statusAccent(status: AuthorisationStatus) {
  switch (status) {
    case "submitted":
    case "pending":
      return { bar: "bg-info", dot: "bg-info" };
    case "approved":
    case "completed":
      return { bar: "bg-success", dot: "bg-success" };
    case "declined":
      return { bar: "bg-destructive", dot: "bg-destructive" };
    default:
      return { bar: "bg-muted-foreground/40", dot: "bg-muted-foreground/50" };
  }
}

function statusMessage(status: string) {
  switch (status) {
    case "submitted":
    case "pending":
      return "Your instructor has been notified and will review this shortly.";
    case "approved":
      return "You're cleared to fly. Have a good one.";
    case "declined":
      return "This flight wasn't authorised. Speak with your instructor.";
    case "cancelled":
      return "This authorisation was archived — the flight isn't going ahead.";
    case "expired":
      return "This wasn't actioned in time. Please submit a new one.";
    case "completed":
      return "Flight closed out. Thanks for checking in.";
    default:
      return "";
  }
}
