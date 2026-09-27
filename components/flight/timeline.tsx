import { cn } from "@/lib/flight/utils";
import { formatRelative } from "@/lib/flight/format";
import type { ActivityEntry } from "@/lib/flight/types";

const VERB_TONE: Record<string, string> = {
  submitted: "bg-info",
  approved: "bg-success",
  declined: "bg-destructive",
  cancelled: "bg-muted-foreground",
  completed: "bg-success",
  commented: "bg-muted-foreground",
};

export function Timeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nothing has happened yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5">
      {/* One continuous rail behind the dots, stopped short of the last item so
          it doesn't dangle past the final event. */}
      <span
        className="absolute top-2 bottom-2 left-[5px] w-px bg-border"
        aria-hidden
      />

      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-4 pl-0">
          <span
            className={cn(
              "relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-background",
              VERB_TONE[entry.verb] ?? "bg-muted-foreground",
            )}
          />
          <div className="min-w-0 flex-1 space-y-0.5 pb-0.5">
            <p className="text-sm leading-snug">{entry.summary}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelative(entry.created_at)}
              {entry.actor_label && ` · ${entry.actor_label}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
