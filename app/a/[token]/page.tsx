import { notFound } from "next/navigation";
import Link from "next/link";

import { StatusBadge } from "@/components/flight/status-badge";
import { Logo } from "@/components/flight/logo";
import { STATUS_META } from "@/lib/flight/constants";
import { getSessionUser } from "@/lib/flight/auth";
import {
  formatDate,
  formatRelative,
  getAuthorisationFormName,
} from "@/lib/flight/format";
import {
  getActivity,
  getAuthorisationByToken,
  getClubLogoUrl,
} from "@/lib/flight/queries";
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

  const [authorisation, user, clubLogoUrl] = await Promise.all([
    getAuthorisationByToken(token),
    getSessionUser(),
    getClubLogoUrl(),
  ]);
  if (!authorisation) notFound();

  const activity = await getActivity(authorisation.id);
  const meta = STATUS_META[authorisation.status];
  const formName = getAuthorisationFormName(authorisation.template_snapshot);
  const registration = authorisation.aircraft_registration ?? "—";
  const isWaiting =
    authorisation.status === "submitted" || authorisation.status === "pending";
  const appearance = statusAppearance(authorisation.status);

  return (
    <div className="min-h-dvh bg-muted/45">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-5">
          <Logo clubLogoUrl={clubLogoUrl} showMark={!clubLogoUrl} />
          <StatusBadge status={authorisation.status} live />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-5 sm:py-8">
        <article className="overflow-hidden rounded-xl border bg-card shadow-xs">
          {/* Header block with solid colour background */}
          <div className={cn("px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6", appearance.bg)}>
            <p className={cn("font-mono text-xs tracking-wide opacity-80", appearance.text)}>
              {authorisation.reference}
            </p>

            <h1 className={cn("mt-2 text-[1.85rem] leading-none font-semibold tracking-[-0.03em]", appearance.text)}>
              {meta.label}
            </h1>

            <p className={cn("mt-3 max-w-md text-[15px] leading-relaxed opacity-90", appearance.text)}>
              {statusMessage(authorisation.status)}
            </p>
          </div>

          <div className="px-5 pt-6 pb-6 sm:px-7 sm:pt-7 sm:pb-8">
            <p className="text-base leading-relaxed text-foreground">
              <span className="font-mono font-semibold tracking-tight">
                {registration}
              </span>
            </p>

            <p className="mt-1.5 text-sm text-muted-foreground">{formName}</p>

            <section className="mt-8 border-t pt-7">
              <h2 className="text-[13px] font-semibold text-foreground">
                Flight details
              </h2>
              <dl className="mt-4 space-y-3">
                <DetailRow label="Pilot" value={authorisation.pilot_name} />
                <DetailRow
                  label="Date"
                  value={formatDate(authorisation.flight_date)}
                />
                <DetailRow
                  label="Exercise"
                  value={authorisation.exercise ?? "—"}
                />
                {authorisation.destination ? (
                  <DetailRow
                    label="Destination"
                    value={authorisation.destination}
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

            {activity.length > 0 ? (
              <section className="mt-9 border-t pt-7">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Updates
                </h2>
                <ol className="mt-4 space-y-4">
                  {activity.map((entry) => (
                    <li key={entry.id}>
                      <p className="text-[15px] leading-snug font-medium">
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
          </div>
        </article>

        <div className="mt-5">
          {user ? (
            <Link
              href="/fly"
              className="inline-flex h-10 items-center justify-center rounded-lg border bg-card px-4 text-sm font-medium shadow-xs transition-colors hover:bg-muted/50"
            >
              Back to my flights
            </Link>
          ) : (
            <Link
              href="/authorise"
              className="inline-flex h-10 items-center justify-center rounded-lg border bg-card px-4 text-sm font-medium shadow-xs transition-colors hover:bg-muted/50"
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
    <div className="flex gap-4 text-[15px]">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function statusAppearance(status: AuthorisationStatus) {
  switch (status) {
    case "submitted":
      return {
        bg: "bg-info",
        text: "text-white",
      };
    case "pending":
      return {
        bg: "bg-warning",
        text: "text-warning-foreground",
      };
    case "approved":
    case "completed":
      return {
        bg: "bg-success",
        text: "text-white",
      };
    case "declined":
      return {
        bg: "bg-destructive",
        text: "text-white",
      };
    case "cancelled":
    case "expired":
      return {
        bg: "bg-muted-foreground/20",
        text: "text-foreground",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-foreground",
      };
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
