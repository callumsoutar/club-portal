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
      className={cn(variant === "plain" ? "space-y-8" : "space-y-4", className)}
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

  return (
    <section
      className={cn(!plain && "overflow-hidden rounded-xl border bg-card")}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          plain ? "mb-3" : "px-4 pt-3.5 pb-2",
        )}
      >
        <h3
          className={cn(
            plain
              ? "text-sm font-semibold tracking-tight text-foreground"
              : "text-[13px] font-semibold tracking-tight",
          )}
        >
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

      <dl className={cn(plain ? "space-y-0" : "divide-y divide-border/70")}>
        {fields.map((field, index) => (
          <AnswerRow
            key={field.key}
            field={field}
            answers={answers}
            sources={sources}
            expiry={expiryByKey[field.key]}
            plain={plain}
            bordered={plain && index > 0}
          />
        ))}
      </dl>
    </section>
  );
}

function AnswerRow({
  field,
  answers,
  sources,
  expiry,
  plain = false,
  bordered = false,
}: {
  field: FormField;
  answers: AnswerMap;
  sources: DataSources;
  expiry?: ExpiryInfo;
  plain?: boolean;
  bordered?: boolean;
}) {
  const isBoolean = field.type === "checkbox" || field.type === "toggle";
  const checked = Boolean(answers[field.key]);
  const value = displayAnswer(field, answers[field.key], sources);

  const note =
    expiry && expiry.state !== "unknown" ? expiry.label : null;

  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-6",
        plain ? "py-2.5" : "px-4 py-2.5",
        bordered && "border-t border-border/60",
      )}
    >
      <dt
        className={cn(
          "max-w-[48%] text-[13px] leading-snug",
          isBoolean && !checked
            ? "font-medium text-destructive"
            : "text-muted-foreground",
        )}
      >
        {field.label}
      </dt>

      <dd className="min-w-0 text-right text-sm leading-snug font-medium tracking-tight">
        {isBoolean ? (
          checked ? (
            <Check
              className="ml-auto size-4 text-foreground/45"
              strokeWidth={2.5}
              aria-label="Confirmed"
            />
          ) : (
            <span className="inline-flex items-center justify-end gap-1 font-medium text-destructive">
              <X className="size-3.5" strokeWidth={2.5} />
              No
            </span>
          )
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
