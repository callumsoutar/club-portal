import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, Phone } from "lucide-react";

import {
  AnswerSections,
  collectIssues,
} from "@/components/flight/authorisation/answer-sections";
import { CommentBox } from "@/components/flight/approval/comment-box";
import { DecisionBar } from "@/components/flight/approval/decision-bar";
import { StatusBadge } from "@/components/flight/status-badge";
import { requireStaff } from "@/lib/flight/auth";
import { LICENCE_SHORT } from "@/lib/flight/constants";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  getAuthorisationFormName,
  getExpiryInfo,
} from "@/lib/flight/format";
import {
  getActivity,
  getAllAircraft,
  getAllInstructors,
  getAuthorisation,
  getComments,
} from "@/lib/flight/queries";
import { getSignatureUrl } from "@/lib/flight/storage";
import type { ExpiryInfo } from "@/lib/flight/format";

export const metadata = { title: "Review authorisation" };

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;

  const authorisation = await getAuthorisation(id);
  if (!authorisation) notFound();

  const [comments, activity, aircraft, instructors, signatureUrl] =
    await Promise.all([
      getComments(id),
      getActivity(id),
      getAllAircraft(),
      getAllInstructors(),
      getSignatureUrl(authorisation.signature_url),
    ]);

  const sources = { aircraft, instructors };

  const bfr = getExpiryInfo(authorisation.pilot_bfr_expiry);
  const medical = getExpiryInfo(authorisation.pilot_medical_expiry);
  const expiryByKey: Record<string, ExpiryInfo> = {
    bfr_expiry: bfr,
    medical_expiry: medical,
  };

  const issues = collectIssues(
    authorisation.template_snapshot,
    authorisation.answers,
    expiryByKey,
  );
  const hasExpiredCurrency =
    bfr.state === "expired" || medical.state === "expired";
  const isActionable = ["submitted", "pending"].includes(authorisation.status);
  const canArchive =
    user.profile.role === "admin" &&
    ["submitted", "pending", "approved"].includes(authorisation.status);

  const registration =
    authorisation.aircraft?.registration ??
    authorisation.aircraft_registration ??
    "—";

  const licence = authorisation.pilot_licence_type
    ? LICENCE_SHORT[authorisation.pilot_licence_type]
    : null;
  const aircraftType = authorisation.aircraft?.aircraft_type;
  const instructorName =
    authorisation.instructor?.full_name ?? "Unassigned instructor";
  const formName = getAuthorisationFormName(authorisation.template_snapshot);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 lg:px-6 lg:pb-10">
      <div className="mb-5">
        <Link
          href="/fly/instructor"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Authorisations
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-soft">
          <header className="space-y-4 border-b px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
                    {authorisation.pilot_name}
                  </h1>
                  <StatusBadge status={authorisation.status} live />
                  {authorisation.is_guest && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Guest
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{formName}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    licence,
                    authorisation.reference,
                    `Submitted ${formatDateTime(authorisation.submitted_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {authorisation.pilot_phone && (
                <a
                  href={`tel:${authorisation.pilot_phone}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60"
                >
                  <Phone className="size-3.5 text-muted-foreground" />
                  Call
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/70 px-3.5 py-3 sm:grid-cols-3 sm:gap-4">
              <MetaFact
                label="Form"
                value={formName}
              />
              <MetaFact
                label="Aircraft"
                value={registration}
                sub={aircraftType}
                mono
              />
              <MetaFact
                label="Date"
                value={formatDate(authorisation.flight_date, "EEE d MMM")}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Exercise ·{" "}
              <span className="font-medium text-foreground">
                {authorisation.exercise ?? "—"}
              </span>
              <span className="mx-2 text-border">·</span>
              Instructor ·{" "}
              <span className="font-medium text-foreground">
                {instructorName}
              </span>
            </p>
          </header>

          {issues.length > 0 && (
            <div className="flex gap-3 border-b bg-danger-muted/70 px-5 py-3.5 sm:px-6">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Needs attention before approval
                </p>
                {issues.map((issue) => (
                  <p key={issue} className="text-sm text-destructive/90">
                    {issue}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8 px-5 py-6 sm:px-6">
            <AnswerSections
              template={authorisation.template_snapshot}
              answers={authorisation.answers}
              sources={sources}
              expiryByKey={expiryByKey}
              variant="plain"
            />

            {signatureUrl && (
              <section className="space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold tracking-tight">
                  Signature
                </h3>
                <div className="relative h-24 max-w-md overflow-hidden rounded-lg border bg-white">
                  <Image
                    src={signatureUrl}
                    alt={`Signature of ${authorisation.pilot_name}`}
                    fill
                    unoptimized
                    className="object-contain object-left p-3"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Signed {formatDateTime(authorisation.signed_at)}
                </p>
              </section>
            )}

            <section className="space-y-4 border-t pt-6">
              <h3 className="text-sm font-semibold tracking-tight">Comments</h3>
              <CommentBox
                authorisationId={authorisation.id}
                comments={comments}
                canPostInternal={user.profile.role !== "member"}
                plain
              />
            </section>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          {(isActionable || canArchive) && (
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Decision
              </p>
              <DecisionBar
                authorisationId={authorisation.id}
                pilotName={authorisation.pilot_name}
                hasExpiredCurrency={hasExpiredCurrency}
                canApprove={isActionable}
                canArchive={canArchive}
              />
            </div>
          )}

          {activity.length > 0 && (
            <section className="rounded-xl border bg-card p-4 shadow-soft">
              <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Activity
              </h3>
              <ol className="space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="space-y-0.5">
                    <p className="text-sm leading-snug">{entry.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(entry.created_at)}
                      {entry.actor_label ? ` · ${entry.actor_label}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaFact({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={
          mono
            ? "mt-0.5 truncate font-mono text-sm font-semibold"
            : "mt-0.5 truncate text-sm font-semibold"
        }
      >
        {value}
      </p>
      {sub ? (
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
