import { History } from "lucide-react";

import { displayAnswer, indexFields, type DataSources } from "@/lib/flight/form-engine";
import { formatDateTime } from "@/lib/flight/format";
import type { AnswerCorrection } from "@/lib/flight/queries";
import type { FormTemplate } from "@/lib/flight/types";

export function CorrectionLog({
  corrections,
  template,
  sources,
  timeZone,
}: {
  corrections: AnswerCorrection[];
  template: FormTemplate | null;
  sources: DataSources;
  timeZone: string;
}) {
  if (corrections.length === 0) return null;

  const fields = template ? indexFields(template) : null;

  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/[0.04]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-muted-foreground" aria-hidden />
        Correction audit
      </h2>
      <ol className="space-y-5">
        {corrections.map((entry) => (
          <li key={entry.id} className="space-y-2">
            <div>
              <p className="text-sm font-medium">
                {entry.actor_label ?? "Admin"} corrected {entry.changes.length}{" "}
                {entry.changes.length === 1 ? "response" : "responses"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(entry.created_at, timeZone)}
              </p>
              {entry.reason ? (
                <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
              ) : null}
            </div>
            <dl className="divide-y divide-border/70 overflow-hidden rounded-xl border">
              {entry.changes.map((change) => {
                const field = fields?.get(change.key)?.field;
                const before = field
                  ? displayAnswer(field, change.before, sources)
                  : plainValue(change.before);
                const after = field
                  ? displayAnswer(field, change.after, sources)
                  : plainValue(change.after);
                return (
                  <div
                    key={change.key}
                    className="grid gap-1 px-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <dt className="text-[13px] text-muted-foreground">
                      {change.label || field?.label || change.key}
                    </dt>
                    <dd className="min-w-0 text-sm">
                      <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                        {before}
                      </span>
                      <span className="px-1.5 text-muted-foreground">→</span>
                      <span className="font-medium break-words">{after}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}

function plainValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
