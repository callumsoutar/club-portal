"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Archive, Ban, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/flight/status-badge";
import type { AuthorisationStatus } from "@/lib/flight/types";

import { Button } from "@/components/flight/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/flight/ui/dialog";
import { Textarea } from "@/components/flight/ui/textarea";
import {
  approveAuthorisation,
  archiveAuthorisation,
  declineAuthorisation,
} from "@/lib/flight/actions/authorisations";
import { toastClearedToFly } from "@/lib/flight/toasts";
import { cn } from "@/lib/flight/utils";

const ReviewStatusContext = createContext<{
  status: AuthorisationStatus;
  setStatus: (status: AuthorisationStatus) => void;
} | null>(null);

/** Keeps the header badge in step with a decision before the server refresh lands. */
export function ReviewStatusProvider({
  status,
  children,
}: {
  status: AuthorisationStatus;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(status);
  const [syncedStatus, setSyncedStatus] = useState(status);

  if (status !== syncedStatus) {
    setSyncedStatus(status);
    setCurrent(status);
  }

  return (
    <ReviewStatusContext.Provider value={{ status: current, setStatus: setCurrent }}>
      {children}
    </ReviewStatusContext.Provider>
  );
}

export function ReviewStatusBadge({ className }: { className?: string }) {
  const review = useContext(ReviewStatusContext);
  if (!review) return null;

  return <StatusBadge status={review.status} className={className} />;
}

/** Quiet archive control, meant to sit beside the status badge. */
export function ReviewArchiveButton({
  authorisationId,
}: {
  authorisationId: string;
}) {
  const router = useRouter();
  const review = useContext(ReviewStatusContext);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  if (review?.status === "cancelled") return null;

  async function archive() {
    setPending(true);
    const result = await archiveAuthorisation(authorisationId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't archive this authorisation.");
      return;
    }
    review?.setStatus("cancelled");
    setOpen(false);
    toast.success("Authorisation archived");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Archive className="size-3.5" strokeWidth={2.25} />
        )}
        Archive
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this authorisation?</DialogTitle>
            <DialogDescription>
              Use this when the flight isn&apos;t going ahead. It will leave the
              active list and show as archived in history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Keep it
            </Button>
            <Button type="button" disabled={pending} onClick={archive}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DecisionBarProps {
  authorisationId: string;
  pilotName: string;
  /** True when currency has actually lapsed, as opposed to a missed tick. */
  hasExpiredCurrency: boolean;
  canApprove?: boolean;
}

/**
 * Approve / decline actions for the review page.
 * Sticky bottom bar on mobile; quiet rail on desktop — no card chrome.
 */
export function DecisionBar({
  authorisationId,
  pilotName,
  hasExpiredCurrency,
  canApprove = true,
}: DecisionBarProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "decline" | null>(null);
  const review = useContext(ReviewStatusContext);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    setPending("approve");
    const result = await approveAuthorisation({ authorisationId });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't approve.");
      return;
    }
    review?.setStatus("approved");
    toastClearedToFly(pilotName);
    router.refresh();
  }

  async function decline() {
    setPending("decline");
    const result = await declineAuthorisation({ authorisationId, reason });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't decline.");
      return;
    }
    review?.setStatus("declined");
    setDeclineOpen(false);
    setReason("");
    toast.success("Authorisation declined");
    router.refresh();
  }

  const showDecisions =
    canApprove &&
    review?.status !== "approved" &&
    review?.status !== "declined";

  return (
    <>
      {showDecisions && (
      <div
        className={cn(
          "pb-safe fixed inset-x-0 bottom-0 z-30 mt-6 border-t border-foreground/10 bg-background/95 px-4 py-3.5 backdrop-blur-md",
          "lg:static lg:border-foreground/10 lg:bg-transparent lg:px-0 lg:pt-5 lg:pb-0 lg:backdrop-blur-none",
        )}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 lg:max-w-none">
            <>
              <button
                type="button"
                onClick={approve}
                disabled={pending !== null}
                className={cn(
                  "inline-flex h-10 min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity outline-none sm:flex-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                  hasExpiredCurrency
                    ? "bg-warning text-warning-foreground hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {pending === "approve" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" strokeWidth={2.5} />
                )}
                {hasExpiredCurrency ? "Approve anyway" : "Approve"}
              </button>

              <button
                type="button"
                onClick={() => setDeclineOpen(true)}
                disabled={pending !== null}
                className="inline-flex h-10 min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors outline-none hover:border-destructive/40 hover:bg-danger-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
              >
                <Ban className="size-4" strokeWidth={2.25} />
                Decline
              </button>
            </>

        </div>
      </div>
      )}

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this authorisation</DialogTitle>
            <DialogDescription>
              {pilotName} will see your reason, so be specific about what needs
              to change.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Forecast crosswind exceeds your solo limit — let's reschedule for tomorrow morning."
            rows={4}
            className="resize-none text-base sm:text-sm"
            autoFocus
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={decline}
              disabled={reason.trim().length < 3 || pending !== null}
              className="h-11 min-h-11 gap-2 px-5 text-sm font-semibold"
            >
              {pending === "decline" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
