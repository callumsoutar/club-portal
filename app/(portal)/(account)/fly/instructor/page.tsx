import { Suspense } from "react";
import Link from "next/link";
import { ClipboardCheck, SearchX } from "lucide-react";

import { AuthorisationCard } from "@/components/flight/authorisation-card";
import { PendingReview } from "@/components/flight/queue/pending-review";
import { QueueFilters } from "@/components/flight/queue/queue-filters";
import { QueueTable } from "@/components/flight/queue/queue-table";
import { Separator } from "@/components/flight/ui/separator";
import { Skeleton } from "@/components/flight/ui/skeleton";
import { requireStaff } from "@/lib/flight/auth";
import { ACTIONABLE_STATUSES } from "@/lib/flight/constants";
import {
  getAllAircraft,
  getAllInstructors,
  getAuthorisationQueue,
  getDashboardStats,
  type QueueFilters as Filters,
} from "@/lib/flight/queries";
import { getSignatureUrl } from "@/lib/flight/storage";
import { cn } from "@/lib/flight/utils";
import type { AuthorisationStatus } from "@/lib/flight/types";
import { Page } from "@/components/portal/page";

export const metadata = { title: "Review queue" };

type SearchParams = Promise<Record<string, string | undefined>>;

const NEEDS_REVIEW = "submitted,pending";

export default async function AuthorisationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStaff();
  const canArchive = user.profile.role === "admin";

  const params = await searchParams;
  const [aircraft, instructors, stats] = await Promise.all([
    getAllAircraft(),
    getAllInstructors(),
    getDashboardStats(),
  ]);

  return (
    <Page width="wide" className="gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
            Review queue
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Authorisations waiting for a decision come first. Use the filters to find anything else.
          </p>
        </div>
        <StatsLine
          pending={stats.pending}
          decidedToday={stats.approvedToday + stats.declinedToday}
          currencyAlerts={stats.expiredMedicals + stats.expiredBfrs}
        />
      </header>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <QueueFilters aircraft={aircraft} instructors={instructors} />
      </Suspense>

      <Suspense key={JSON.stringify(params)} fallback={<ListSkeleton />}>
        <AuthorisationResults
          params={params}
          aircraft={aircraft}
          instructors={instructors}
          canArchive={canArchive}
        />
      </Suspense>
    </Page>
  );
}

function StatsLine({
  pending,
  decidedToday,
  currencyAlerts,
}: {
  pending: number;
  decidedToday: number;
  currencyAlerts: number;
}) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <StatLink
        href={`/fly/instructor?status=${NEEDS_REVIEW}`}
        label="review"
        value={pending}
        emphasize={pending > 0}
      />
      <Separator orientation="vertical" className="hidden h-3 sm:block" />
      <StatItem label="decided today" value={decidedToday} />
      {currencyAlerts > 0 && (
        <>
          <Separator orientation="vertical" className="hidden h-3 sm:block" />
          <StatItem
            label="currency"
            value={currencyAlerts}
            className="text-destructive"
          />
        </>
      )}
    </dl>
  );
}

function StatLink({
  href,
  label,
  value,
  emphasize,
}: {
  href: string;
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-baseline gap-1.5 transition-colors hover:text-foreground",
        emphasize ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      <span className="text-muted-foreground">{label}</span>
    </Link>
  );
}

function StatItem({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-baseline gap-1.5 text-muted-foreground",
        className,
      )}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="font-semibold tabular-nums text-inherit">{value}</dd>
      <span>{label}</span>
    </div>
  );
}

async function AuthorisationResults({
  params,
  aircraft,
  instructors,
  canArchive = false,
}: {
  params: Record<string, string | undefined>;
  aircraft: Awaited<ReturnType<typeof getAllAircraft>>;
  instructors: Awaited<ReturnType<typeof getAllInstructors>>;
  canArchive?: boolean;
}) {
  const statusParam = params.status ?? NEEDS_REVIEW;
  const statuses =
    statusParam === "all" || statusParam === ""
      ? undefined
      : (statusParam.split(",").filter(Boolean) as AuthorisationStatus[]);

  const hasExtraFilters = Boolean(
    params.q ||
      params.aircraft ||
      params.instructor ||
      params.licence ||
      params.from ||
      params.to,
  );

  const isNeedsReview =
    !hasExtraFilters &&
    (statusParam === NEEDS_REVIEW ||
      (Array.isArray(statuses) &&
        statuses.length === ACTIONABLE_STATUSES.length &&
        ACTIONABLE_STATUSES.every((s) => statuses.includes(s))));

  const filters: Filters = {
    status: statuses,
    aircraftId: params.aircraft,
    instructorId: params.instructor,
    licenceType: params.licence,
    search: params.q,
    from: params.from,
    to: params.to,
  };

  const rows = await getAuthorisationQueue({
    ...filters,
    limit: isNeedsReview ? 24 : 100,
  });

  if (isNeedsReview) {
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ClipboardCheck className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Nothing needs review</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            New submissions will show up here. Use the filters to browse
            approved or past flights.
          </p>
        </div>
      );
    }

    return (
      <PendingReview
        items={await Promise.all(
          rows.map(async (a) => ({
            ...a,
            signatureSignedUrl: await getSignatureUrl(a.signature_url),
          })),
        )}
        sources={{ aircraft, instructors }}
        canArchive={canArchive}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <SearchX className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Nothing matches</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          No authorisations fit these filters. Try widening the status or
          clearing search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {rows.length} result{rows.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-hidden rounded-lg border bg-card md:hidden">
        <ul className="divide-y">
          {rows.map((a) => (
            <li key={a.id}>
              <AuthorisationCard
                authorisation={a}
                href={`/fly/instructor/authorisations/${a.id}`}
                showPilot
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden md:block">
        <QueueTable rows={rows} canArchive={canArchive} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Skeleton className="h-10 w-full rounded-none" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-none border-t" />
      ))}
    </div>
  );
}
