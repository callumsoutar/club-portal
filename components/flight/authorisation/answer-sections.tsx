import { Check, X } from "lucide-react";

import {
  displayAnswer,
  isPresentational,
  type DataSources,
} from "@/lib/flight/form-engine";
import type { ExpiryInfo } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type {
  AnswerMap,
  FormField,
  FormSection,
  FormTemplate,
} from "@/lib/flight/types";

interface AnswerSectionsProps {
  /** The frozen snapshot, so a submission always renders as the pilot saw it. */
  template: FormTemplate | null;
  answers: AnswerMap;
  sources: DataSources;
  /** Computed currency status, keyed by field — rendered inline on that row. */
  expiryByKey?: Record<string, ExpiryInfo>;
  /** `plain` drops card chrome for document-style review pages. */
  variant?: "cards" | "plain";
  className?: string;
}

/**
 * Renders a submission as dense label/value rows — scannable without empty
 * chrome. Use `variant="plain"` on full-page reviews.
 */
export function AnswerSections({
  template,
  answers,
  sources,
  expiryByKey = {},
  variant = "cards",
  className,
}: AnswerSectionsProps) {
  const sections = (template?.sections ?? []).filter((s) =>
    s.fields.some((f) => !isPresentational(f) && f.type !== "signature"),
  );

  if (sections.length === 0) return null;

  return (
    <div
      className={cn(variant === "plain" ? "space-y-5 lg:space-y-6" : "space-y-4", className)}
    >
      {sections.map((section) => (
        <AnswerSection
          key={section.key}
          section={section}
          answers={answers}
          sources={sources}
          expiryByKey={expiryByKey}
          variant={variant}
        />
      ))}
    </div>
  );
}

function AnswerSection({
  section,
  answers,
  sources,
  expiryByKey,
  variant,
}: {
  section: FormSection;
  answers: AnswerMap;
  sources: DataSources;
  expiryByKey: Record<string, ExpiryInfo>;
  variant: "cards" | "plain";
}) {
  const fields = section.fields
    .filter((f) => !isPresentational(f) && f.type !== "signature")
    .sort((a, b) => a.sort_order - b.sort_order);

  if (fields.length === 0) return null;

  const booleans = fields.filter(
    (f) => f.type === "checkbox" || f.type === "toggle",
  );
  const confirmed = booleans.filter((f) => Boolean(answers[f.key])).length;
  const allBoolean = booleans.length === fields.length && booleans.length > 0;
  const incomplete = allBoolean && confirmed < booleans.length;
  const plain = variant === "plain";

  if (plain) {
    return (
      <section className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.04]">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">
            {section.title}
          </h3>
          {allBoolean && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                incomplete
                  ? "bg-danger-muted text-destructive"
                  : "bg-success-muted text-success",
              )}
            >
              {incomplete ? (
                <X className="size-3" strokeWidth={2.75} />
              ) : (
                <Check className="size-3" strokeWidth={2.75} />
              )}
              {confirmed}/{booleans.length} confirmed
            </span>
          )}
        </div>

        {allBoolean ? (
          <ul className="divide-y divide-border/70">
            {fields.map((field) => (
              <ChecklistRow
                key={field.key}
                label={field.label}
                checked={Boolean(answers[field.key])}
              />
            ))}
          </ul>
        ) : (
          <dl className="divide-y divide-border/70">
            {fields.map((field) => (
              <AnswerRow
                key={field.key}
                field={field}
                answers={answers}
                sources={sources}
                expiry={expiryByKey[field.key]}
                plain
              />
            ))}
          </dl>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <h3 className="text-[13px] font-semibold tracking-tight">
          {section.title}
        </h3>
        {allBoolean && (
          <span
            className={cn(
              "text-xs tabular-nums",
              incomplete
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
          >
            {confirmed}/{booleans.length}
          </span>
        )}
      </div>

      <dl className="divide-y divide-border/70">
        {fields.map((field) => (
          <AnswerRow
            key={field.key}
            field={field}
            answers={answers}
            sources={sources}
            expiry={expiryByKey[field.key]}
          />
        ))}
      </dl>
    </section>
  );
}

function ChecklistRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-5 py-3 text-sm leading-snug",
        !checked && "bg-danger-muted/60",
      )}
    >
      <span
        className={cn(
          "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-success-muted text-success"
            : "bg-destructive text-white",
        )}
      >
        {checked ? (
          <Check className="size-3" strokeWidth={3} aria-label="Confirmed" />
        ) : (
          <X className="size-3" strokeWidth={3} aria-label="Not confirmed" />
        )}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1",
          checked ? "text-foreground" : "font-medium text-destructive",
        )}
      >
        {label}
      </span>
      {!checked && (
        <span className="shrink-0 text-xs font-semibold text-destructive uppercase">
          Not confirmed
        </span>
      )}
    </li>
  );
}

function AnswerRow({
  field,
  answers,
  sources,
  expiry,
  plain = false,
}: {
  field: FormField;
  answers: AnswerMap;
  sources: DataSources;
  expiry?: ExpiryInfo;
  plain?: boolean;
}) {
  const isBoolean = field.type === "checkbox" || field.type === "toggle";
  const checked = Boolean(answers[field.key]);
  const value = displayAnswer(field, answers[field.key], sources);

  const note =
    expiry && expiry.state !== "unknown" ? expiry.label : null;

  return (
    <div
      className={cn(
        plain
          ? "grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-6"
          : "flex items-baseline justify-between gap-6 px-4 py-2.5",
        plain && isBoolean && !checked && "bg-danger-muted/60",
      )}
    >
      <dt
        className={cn(
          "text-[13px] leading-snug",
          !plain && "max-w-[48%]",
          isBoolean && !checked
            ? "font-medium text-destructive"
            : "text-muted-foreground",
        )}
      >
        {field.label}
      </dt>

      <dd
        className={cn(
          "min-w-0 text-sm leading-snug font-medium",
          plain ? "text-left" : "text-right tracking-tight",
        )}
      >
        {isBoolean ? (
          checked ? (
            plain ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <span className="flex size-5 items-center justify-center rounded-full bg-success-muted">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                Yes
              </span>
            ) : (
              <Check
                className="ml-auto size-4 text-foreground/70"
                strokeWidth={2.5}
                aria-label="Confirmed"
              />
            )
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium text-destructive",
                !plain && "justify-end",
              )}
            >
              <X className="size-3.5" strokeWidth={2.5} />
              No
            </span>
          )
        ) : plain ? (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "break-words text-foreground",
                value === "—" && "font-normal text-muted-foreground/50",
                expiry?.state === "expired" && "text-destructive",
              )}
            >
              {value}
            </span>
            {note && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                  expiry?.state === "expired" &&
                    "bg-danger-muted text-destructive",
                  expiry?.state === "expiring" &&
                    "bg-warning-muted text-warning-foreground",
                  expiry?.state === "valid" && "bg-success-muted text-success",
                )}
              >
                {note}
              </span>
            )}
          </span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                "break-words",
                value === "—" && "font-normal text-muted-foreground/50",
                expiry?.state === "expired" && "text-destructive",
              )}
            >
              {value}
            </span>
            {note && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                  expiry?.state === "expired" &&
                    "bg-danger-muted text-destructive",
                  expiry?.state === "expiring" &&
                    "bg-warning-muted text-warning-foreground",
                  expiry?.state === "valid" &&
                    "bg-success-muted text-success",
                )}
              >
                {note}
              </span>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}

/**
 * The exceptions in a submission: expired currency and anything the pilot
 * left unticked. Returns an empty array for a clean submission.
 */
export function collectIssues(
  template: FormTemplate | null,
  answers: AnswerMap,
  expiryByKey: Record<string, ExpiryInfo>,
): string[] {
  const issues: string[] = [];

  for (const [key, info] of Object.entries(expiryByKey)) {
    if (info.state !== "expired") continue;
    const label = key === "medical_expiry" ? "Medical" : "BFR";
    issues.push(`${label} expired — ${info.label}`);
  }

  for (const section of template?.sections ?? []) {
    for (const field of section.fields) {
      const isBoolean = field.type === "checkbox" || field.type === "toggle";
      if (isBoolean && !answers[field.key]) {
        issues.push(`Not confirmed — ${field.label}`);
      }
    }
  }

  return issues;
}
