import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Clock,
  History,
  Mail,
  MessageSquare,
  PenLine,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  AnswerSections,
  collectIssues,
} from "@/components/flight/authorisation/answer-sections";
import { CommentBox } from "@/components/flight/approval/comment-box";
import {
  DecisionBar,
  ReviewArchiveButton,
  ReviewStatusBadge,
  ReviewStatusProvider,
} from "@/components/flight/approval/decision-bar";
import { requireStaff } from "@/lib/flight/auth";
import { LICENCE_SHORT } from "@/lib/flight/constants";
import { reviewQuantityIssues, type FlightFigures } from "@/lib/flight/endurance";
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
  getAuthorisationEmails,
  getClubSettings,
  getComments,
} from "@/lib/flight/queries";
import { getSignatureUrl } from "@/lib/flight/storage";
import { cn } from "@/lib/flight/utils";
import type { ExpiryInfo } from "@/lib/flight/format";
import type {
  AuthorisationEmail,
  NotificationEvent,
  NotificationStatus,
} from "@/lib/flight/types";

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

  const [comments, activity, emails, aircraft, instructors, signatureUrl, club] =
    await Promise.all([
      getComments(id),
      getActivity(id),
      getAuthorisationEmails(id),
      getAllAircraft(),
      getAllInstructors(),
      getSignatureUrl(authorisation.signature_url),
      getClubSettings(),
    ]);

  const flightFigures: FlightFigures = {
    fuelBurnLph: authorisation.aircraft?.fuel_burn_lph ?? null,
    minOilQuarts: authorisation.aircraft?.min_oil_quarts ?? null,
    reserveMinutes: club?.club_reserve_minutes ?? 45,
  };

  const sources = { aircraft, instructors };

  const bfr = getExpiryInfo(authorisation.pilot_bfr_expiry);
  const medical = getExpiryInfo(authorisation.pilot_medical_expiry);
  const expiryByKey: Record<string, ExpiryInfo> = {
    bfr_expiry: bfr,
    medical_expiry: medical,
  };

  // Currency is shown in its own tiles, so only unticked items are listed here.
  const unconfirmed = collectIssues(
    authorisation.template_snapshot,
    authorisation.answers,
    {},
  );
  const quantityIssues = reviewQuantityIssues(
    authorisation.answers,
    flightFigures,
  );
  const hasExpiredCurrency =
    bfr.state === "expired" || medical.state === "expired";
  const allClear =
    unconfirmed.length === 0 &&
    bfr.state !== "expired" &&
    medical.state !== "expired";
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
    <div className="-my-8 flex-1 bg-muted/70 py-6 md:-my-10 md:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 lg:px-8 lg:pb-16">
        <Link
          href="/fly/instructor"
          className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Review queue
        </Link>

        <ReviewStatusProvider status={authorisation.status}>
          <article className="mt-4 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
            <header className="order-1 rounded-2xl bg-card p-6 shadow-soft ring-1 ring-foreground/[0.04] sm:p-7 lg:col-start-1 lg:row-start-1">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-[1.75rem]">
                      {authorisation.pilot_name}
                    </h1>
                    <ReviewStatusBadge />
                  </div>
                  <p className="mt-1.5 text-[15px] text-muted-foreground">
                    {formName}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground/80">
                    {[
                      licence,
                      authorisation.is_guest ? "Guest" : null,
                      authorisation.reference,
                      `Submitted ${formatDateTime(authorisation.submitted_at)}`,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {authorisation.pilot_phone && (
                    <a
                      href={`tel:${authorisation.pilot_phone}`}
                      aria-label={`Call ${authorisation.pilot_name}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <Phone className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                  {canArchive && (
                    <ReviewArchiveButton authorisationId={authorisation.id} />
                  )}
                </div>
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <Fact label="Aircraft" value={registration} detail={aircraftType} />
                <Fact
                  label="Flight date"
                  value={formatDate(authorisation.flight_date, "EEE d MMM")}
                />
                <Fact label="Exercise" value={authorisation.exercise ?? "—"} />
                <Fact label="Instructor" value={instructorName} />
              </dl>
            </header>

            <aside className="contents lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
              <Panel
                icon={ShieldCheck}
                title="Pre-flight checks"
                className="order-2"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <CurrencyTile
                    label="BFR"
                    info={bfr}
                    date={authorisation.pilot_bfr_expiry}
                  />
                  <CurrencyTile
                    label="Medical"
                    info={medical}
                    date={authorisation.pilot_medical_expiry}
                  />
                </div>

                {unconfirmed.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-danger-muted px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                      <AlertTriangle className="size-4" aria-hidden />
                      {unconfirmed.length} item
                      {unconfirmed.length === 1 ? "" : "s"} not confirmed
                    </p>
                    <ul className="mt-1.5 space-y-1 pl-5.5 text-[13px] text-destructive/90">
                      {unconfirmed.map((issue) => (
                        <li key={issue} className="list-disc">
                          {issue.replace(/^Not confirmed — /, "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : allClear ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-success-muted px-3 py-2.5 text-sm font-medium text-success">
                    <CircleCheck className="size-4" aria-hidden />
                    All declarations confirmed
                  </p>
                ) : null}

                {quantityIssues.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-danger-muted px-3.5 py-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                      <AlertTriangle className="size-4" aria-hidden />
                      Fuel or oil needs attention
                    </p>
                    <ul className="mt-1.5 space-y-1 pl-5.5 text-[13px] text-destructive/90">
                      {quantityIssues.map((issue) => (
                        <li key={issue} className="list-disc">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {isActionable && (
                  <DecisionBar
                    authorisationId={authorisation.id}
                    pilotName={authorisation.pilot_name}
                    hasExpiredCurrency={hasExpiredCurrency}
                    canApprove={isActionable}
                  />
                )}
              </Panel>

              <Panel
                icon={Mail}
                title="Emails"
                className="order-4"
                action={
                  emails.length > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {emails.length}
                    </span>
                  ) : null
                }
              >
                <EmailLog emails={emails} />
              </Panel>

              {activity.length > 0 && (
                <Panel icon={History} title="Activity" className="order-5">
                  <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-border">
                    {activity.map((entry, index) => (
                      <li key={entry.id} className="relative pl-6">
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-card",
                            index === 0 ? "bg-primary" : "bg-muted-foreground/40",
                          )}
                        />
                        <p className="text-sm leading-snug">{entry.summary}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatRelative(entry.created_at)}
                          {entry.actor_label ? ` · ${entry.actor_label}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Panel>
              )}
            </aside>

            <div className="order-3 flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2 lg:gap-6">
              <AnswerSections
                template={authorisation.template_snapshot}
                answers={authorisation.answers}
                sources={sources}
                expiryByKey={expiryByKey}
                flightFigures={flightFigures}
                variant="plain"
              />

              {signatureUrl && (
                <Panel icon={PenLine} title="Pilot signature">
                  <div className="relative h-24 rounded-lg border border-dashed bg-muted/30">
                    <Image
                      src={signatureUrl}
                      alt={`Signature of ${authorisation.pilot_name}`}
                      fill
                      unoptimized
                      className="object-contain object-left p-3"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Signed {formatDateTime(authorisation.signed_at)}
                  </p>
                </Panel>
              )}

              <Panel
                icon={MessageSquare}
                title="Comments"
                action={
                  comments.length > 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {comments.length}
                    </span>
                  ) : null
                }
              >
                <CommentBox
                  authorisationId={authorisation.id}
                  comments={comments}
                  canPostInternal={user.profile.role !== "member"}
                  plain
                />
              </Panel>
            </div>
          </article>
        </ReviewStatusProvider>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/[0.04]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 line-clamp-2 text-[15px] leading-snug font-medium break-words">
        {value}
      </dd>
      {detail ? (
        <dd className="mt-0.5 truncate text-xs text-muted-foreground">
          {detail}
        </dd>
      ) : null}
    </div>
  );
}

const EMAIL_EVENT_LABEL: Record<NotificationEvent, string> = {
  authorisation_submitted: "Authorisation submitted",
  instructor_assigned: "Instructor assigned",
  approval_granted: "Approval granted",
  approval_declined: "Approval declined",
  comment_added: "Comment added",
  reminder_before_eta: "Return reminder",
  overdue_return: "Overdue return",
  medical_expiring: "Medical expiring",
  bfr_expiring: "BFR expiring",
  welcome: "Welcome",
  password_reset: "Password reset",
  account_created: "Account created",
};

const EMAIL_STATUS: Record<NotificationStatus, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-success-muted text-success" },
  skipped: { label: "Not sent", className: "bg-muted text-muted-foreground" },
  failed: { label: "Failed", className: "bg-danger-muted text-destructive" },
  queued: { label: "Queued", className: "bg-warning-muted text-warning-foreground" },
  sending: { label: "Sending", className: "bg-warning-muted text-warning-foreground" },
};

function EmailLog({ emails }: { emails: AuthorisationEmail[] }) {
  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No emails have been recorded for this authorisation.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {emails.map((email) => {
        const status = EMAIL_STATUS[email.status] ?? EMAIL_STATUS.queued;
        const when = email.sent_at ?? email.created_at;
        return (
          <li key={email.id} className="rounded-xl bg-muted/50 px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-snug font-medium">
                {email.subject || EMAIL_EVENT_LABEL[email.event] || email.event}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  status.className,
                )}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {EMAIL_EVENT_LABEL[email.event] ?? email.event}
              {" · "}
              {email.recipient_name
                ? `${email.recipient_name} (${email.recipient_email})`
                : email.recipient_email}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {email.status === "sent" ? "Sent" : "Recorded"} {formatRelative(when)}
              {" · "}
              {formatDateTime(when)}
            </p>
            {email.error ? (
              <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                {email.error}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const CURRENCY_TONE: Record<ExpiryInfo["state"], string> = {
  expired: "bg-danger-muted text-destructive",
  expiring: "bg-warning-muted text-warning-foreground",
  valid: "bg-success-muted text-success",
  unknown: "bg-muted text-muted-foreground",
};

function CurrencyTile({
  label,
  info,
  date,
}: {
  label: string;
  info: ExpiryInfo;
  date: string | null;
}) {
  const Icon =
    info.state === "expired"
      ? CircleX
      : info.state === "expiring"
        ? AlertTriangle
        : info.state === "valid"
          ? CircleCheck
          : Clock;

  return (
    <div className={cn("rounded-xl px-3.5 py-3", CURRENCY_TONE[info.state])}>
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-sm leading-tight font-semibold">
        {info.state === "expired" ? `Expired ${info.label}` : info.label}
      </p>
      {date && (
        <p className="mt-0.5 text-xs opacity-75">
          {formatDate(date, "d MMM yyyy")}
        </p>
      )}
    </div>
  );
}
