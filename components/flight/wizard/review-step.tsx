"use client";

import { AlertTriangle, Check, Pencil } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { displayAnswer, isPresentational, type DataSources } from "@/lib/flight/form-engine";
import { cn } from "@/lib/flight/utils";
import type { AnswerMap, FormTemplate } from "@/lib/flight/types";

interface ReviewStepProps {
  template: FormTemplate;
  answers: AnswerMap;
  sources: DataSources;
  onEditSection: (index: number) => void;
}

/**
 * Final read-back before submitting.
 *
 * Checklist sections collapse to a single "all confirmed" line rather than
 * repeating eight identical "Yes" rows — the pilot has already ticked them,
 * and burying the flight details under boilerplate is how people stop reading
 * the review screen at all.
 */
export function ReviewStep({
  template,
  answers,
  sources,
  onEditSection,
}: ReviewStepProps) {
  return (
    <div className="space-y-4">
      {template.sections.map((section, index) => {
        const fields = section.fields
          .filter((f) => !isPresentational(f) && f.type !== "signature")
          .sort((a, b) => a.sort_order - b.sort_order);

        if (fields.length === 0) return null;

        const allBoolean = fields.every(
          (f) => f.type === "checkbox" || f.type === "toggle",
        );
        const unchecked = fields.filter((f) => !answers[f.key]);

        return (
          <section
            key={section.key}
            className="overflow-hidden rounded-xl border bg-card shadow-xs"
          >
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditSection(index)}
                className="-my-1 h-8 gap-1.5 text-xs text-muted-foreground"
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            </header>

            {allBoolean ? (
              <div className="px-4 py-3.5">
                {unchecked.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <Check className="size-4" strokeWidth={2.5} />
                    All {fields.length} items confirmed
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                      <AlertTriangle className="size-4" />
                      {unchecked.length} item{unchecked.length === 1 ? "" : "s"} not confirmed
                    </p>
                    <ul className="space-y-1 pl-6">
                      {unchecked.map((f) => (
                        <li key={f.key} className="list-disc text-xs text-muted-foreground">
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <dl className="divide-y">
                {fields.map((field) => {
                  const value = displayAnswer(field, answers[field.key], sources);
                  const empty = value === "—";

                  return (
                    <div
                      key={field.key}
                      className="flex items-baseline justify-between gap-4 px-4 py-3"
                    >
                      <dt className="shrink-0 text-xs text-muted-foreground">
                        {field.label}
                      </dt>
                      <dd
                        className={cn(
                          "min-w-0 text-right text-sm font-medium break-words",
                          empty && "text-muted-foreground/60",
                        )}
                      >
                        {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
