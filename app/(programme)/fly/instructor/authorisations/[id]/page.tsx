import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, Phone } from "lucide-react";

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
import { cn } from "@/lib/flight/utils";
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 lg:px-6 lg:pb-16">
      <Link
        href="/fly/instructor"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Authorisations
      </Link>

      <ReviewStatusProvider status={authorisation.status}>
      <article className="mt-5 bg-background px-6 py-8 sm:px-10 sm:py-10">
      <header className="relative">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          {canArchive && (
            <ReviewArchiveButton authorisationId={authorisation.id} />
          )}
          <ReviewStatusBadge />
        </div>
        <h1 className="pr-36 text-[2rem] leading-none font-semibold tracking-[-0.035em] sm:pr-44">
          {authorisation.pilot_name}
        </h1>
        <p className="mt-3 text-base">{formName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {[
            licence,
            authorisation.is_guest ? "Guest" : null,
            authorisation.reference,
            formatDateTime(authorisation.submitted_at),
          ]
            .filter(Boolean)
            .join(" · ")}
          {authorisation.pilot_phone ? (
            <>
              {" · "}
              <a
                href={`tel:${authorisation.pilot_phone}`}
                className="text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
              >
                <Phone className="mr-1 inline size-3.5 align-[-2px]" />
                Call
              </a>
            </>
          ) : null}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-foreground/10 pt-6 sm:grid-cols-4">
          <Fact label="Aircraft" value={registration} detail={aircraftType} mono />
          <Fact
            label="Date"
            value={formatDate(authorisation.flight_date, "EEE d MMM")}
          />
          <Fact label="Exercise" value={authorisation.exercise ?? "—"} />
          <Fact label="Instructor" value={instructorName} />
        </dl>

        <p className="mt-5 text-sm text-muted-foreground">
          <CurrencyNote label="BFR" info={bfr} />
          <span className="mx-2.5 text-foreground/20">·</span>
          <CurrencyNote label="Medical" info={medical} />
        </p>

        {issues.length > 0 && (
          <div className="mt-4 flex gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              {issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          </div>
        )}

        {isActionable && (
          <DecisionBar
            authorisationId={authorisation.id}
            pilotName={authorisation.pilot_name}
            hasExpiredCurrency={hasExpiredCurrency}
            canApprove={isActionable}
          />
        )}
      </header>

      <div className="mt-10 border-t border-foreground/10 pt-10">
        <AnswerSections
          template={authorisation.template_snapshot}
          answers={authorisation.answers}
          sources={sources}
          expiryByKey={expiryByKey}
          variant="plain"
        />

        {signatureUrl && (
          <section className="mt-10">
            <h2 className="border-b border-foreground/15 pb-2 text-sm font-semibold">
              Signature
            </h2>
            <div className="relative mt-4 h-20 max-w-xs">
              <Image
                src={signatureUrl}
                alt={`Signature of ${authorisation.pilot_name}`}
                fill
                unoptimized
                className="object-contain object-left"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed {formatDateTime(authorisation.signed_at)}
            </p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="border-b border-foreground/15 pb-2 text-sm font-semibold">
            Comments
          </h2>
          <div className="mt-4">
            <CommentBox
              authorisationId={authorisation.id}
              comments={comments}
              canPostInternal={user.profile.role !== "member"}
              plain
            />
          </div>
        </section>

        {activity.length > 0 && (
          <section className="mt-10">
            <h2 className="border-b border-foreground/15 pb-2 text-sm font-semibold">
              Activity
            </h2>
            <ol className="mt-4 space-y-4">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <p className="text-sm">{entry.summary}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatRelative(entry.created_at)}
                    {entry.actor_label ? ` · ${entry.actor_label}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      </article>
      </ReviewStatusProvider>
    </div>
  );
}

function Fact({
  label,
  value,
  detail,
  mono,
}: {
  label: string;
  value: string;
  detail?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-[15px] font-medium",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
      {detail ? (
        <dd className="truncate text-sm text-muted-foreground">{detail}</dd>
      ) : null}
    </div>
  );
}

function CurrencyNote({ label, info }: { label: string; info: ExpiryInfo }) {
  return (
    <span>
      {label}{" "}
      <span
        className={cn(
          "text-foreground",
          info.state === "expired" && "text-destructive",
          info.state === "expiring" && "font-medium text-warning-foreground",
        )}
      >
        {info.label}
      </span>
    </span>
  );
}
