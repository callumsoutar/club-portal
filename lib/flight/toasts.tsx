import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/** Celebratory toast after an instructor clears a pilot to fly. */
export function toastClearedToFly(pilotName: string) {
  toast.custom(
    (id) => (
      <div className="flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-success/25 bg-card p-4 shadow-lift">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-muted text-success">
          <CheckCircle2 className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-foreground">Cleared to fly</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">{pilotName}</span> is
            approved and has been notified.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
    ),
    { duration: 5200 },
  );
}
