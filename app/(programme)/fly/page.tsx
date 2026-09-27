import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { AuthorisationCard } from "@/components/flight/authorisation-card";
import { requireUser } from "@/lib/flight/auth";
import { getExpiryInfo } from "@/lib/flight/format";
import { getMyAuthorisations } from "@/lib/flight/queries";
import { cn } from "@/lib/flight/utils";

export const metadata = { title: "My flights" };

export default async function DashboardPage() {
  const user = await requireUser();
  const authorisations = await getMyAuthorisations(user.id);

  const active = authorisations.filter((a) =>
    ["submitted", "pending", "approved"].includes(a.status),
  );
  const past = authorisations.filter((a) => !active.includes(a));

  const warnings = [
    { label: "BFR", info: getExpiryInfo(user.pilot?.bfr_expiry) },
    { label: "Medical", info: getExpiryInfo(user.pilot?.medical_expiry) },
  ].filter((w) => w.info.state === "expired" || w.info.state === "expiring");

  const hasExpired = warnings.some((w) => w.info.state === "expired");
  const firstName =
    user.profile.full_name?.trim().split(/\s+/)[0] ||
    user.email.split("@")[0] ||
    "there";
  const isEmpty = active.length === 0 && past.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-12 lg:px-6">
      {warnings.length > 0 && (
        <Link
          href="/fly/profile"
          className={cn(
            "flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition-colors",
            hasExpired
              ? "border-destructive/20 bg-danger-muted text-destructive hover:bg-danger-muted/80"
              : "border-warning/25 bg-warning-muted text-warning-foreground hover:bg-warning-muted/80",
          )}
        >
          <span className="min-w-0 leading-snug">
            <span className="font-medium">
              {warnings.map((w) => w.label).join(" & ")}
            </span>
            <span className="opacity-80">
              {" — "}
              {warnings.length === 1
                ? warnings[0]!.info.label
                : "Update before you fly"}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium underline decoration-current/30 underline-offset-4">
            Profile
          </span>
        </Link>
      )}

      {isEmpty ? (
        <EmptyDashboard firstName={firstName} />
      ) : (
        <>
          <header className="flex flex-col gap-4 border-b border-foreground/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">
                My flights
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {active.length === 0
                  ? `${firstName}, nothing open right now.`
                  : `${active.length} open · ${past.length} past`}
              </p>
            </div>

            <Link
              href="/authorise"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" strokeWidth={2.25} />
              New authorisation
            </Link>
          </header>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[13px] font-semibold text-foreground/80">
                Active
              </h3>
              {active.length > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {active.length}
                </span>
              )}
            </div>

            {active.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Open authorisations show up here while they&apos;re waiting or
                approved.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                <ul className="divide-y divide-border/70">
                  {active.map((a) => (
                    <li key={a.id} className="px-4">
                      <AuthorisationCard
                        authorisation={a}
                        href={`/a/${a.access_token}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-foreground/80">
                  History
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {past.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                <ul className="divide-y divide-border/70">
                  {past.map((a) => (
                    <li key={a.id} className="px-4">
                      <AuthorisationCard
                        authorisation={a}
                        href={`/a/${a.access_token}`}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyDashboard({ firstName }: { firstName: string }) {
  return (
    <>
      <header className="border-b border-foreground/10 pb-5">
        <h2 className="text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">
          My flights
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {firstName}, ready when you are.
        </p>
      </header>

      <section className="rounded-xl border bg-card px-5 py-10 shadow-xs sm:px-8">
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Authorise from your phone in about a minute. Your instructor is
          notified as soon as you sign.
        </p>
        <Link
          href="/authorise"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start an authorisation
          <ArrowUpRight className="size-4" strokeWidth={2.25} />
        </Link>
      </section>
    </>
  );
}
