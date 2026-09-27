"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Ban, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

interface DecisionBarProps {
  authorisationId: string;
  pilotName: string;
  /** True when currency has actually lapsed, as opposed to a missed tick. */
  hasExpiredCurrency: boolean;
  canApprove?: boolean;
  canArchive?: boolean;
}

/**
 * Approve / decline / archive actions for the review page.
 * Sticky bottom bar on mobile; quiet rail on desktop — no card chrome.
 */
export function DecisionBar({
  authorisationId,
  pilotName,
  hasExpiredCurrency,
  canApprove = true,
  canArchive = false,
}: DecisionBarProps) {
  const router = useRouter();
  const [pending, setPending] = useState<
    "approve" | "decline" | "archive" | null
  >(null);
  const [approved, setApproved] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    setPending("approve");
    const result = await approveAuthorisation({ authorisationId });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't approve.");
      return;
    }
    setApproved(true);
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
    setDeclineOpen(false);
    setReason("");
    toast.success("Authorisation declined");
    router.refresh();
  }

  async function archive() {
    setPending("archive");
    const result = await archiveAuthorisation(authorisationId);
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't archive this authorisation.");
      return;
    }
    setArchiveOpen(false);
    toast.success("Authorisation archived");
    router.refresh();
  }

  return (
    <>
      <div
        className={cn(
          "pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3.5 backdrop-blur-md",
          "lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
        )}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 lg:max-w-none">
          {canApprove && !approved && (
            <div className="flex w-full gap-3 lg:flex-col">
              <button
                type="button"
                onClick={approve}
                disabled={pending !== null}
                className={cn(
                  "inline-flex h-16 w-full flex-1 items-center justify-center gap-3 rounded-xl px-6 text-lg font-semibold transition-opacity outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                  hasExpiredCurrency
                    ? "bg-warning text-warning-foreground hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {pending === "approve" ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <Check className="size-6" strokeWidth={2.5} />
                )}
                {hasExpiredCurrency ? "Approve anyway" : "Approve"}
              </button>

              <button
                type="button"
                onClick={() => setDeclineOpen(true)}
                disabled={pending !== null}
                className="inline-flex h-16 w-full min-w-[7.5rem] flex-1 items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 text-lg font-semibold text-muted-foreground transition-colors outline-none hover:bg-danger-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Ban className="size-6" strokeWidth={2.25} />
                Decline
              </button>
            </div>
          )}

          {approved && (
            <div className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-success-muted px-6 text-lg font-semibold text-success">
              <Check className="size-6" strokeWidth={2.5} />
              Cleared to fly
            </div>
          )}

          {canArchive && (
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              disabled={pending !== null}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-5 text-base font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending === "archive" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Archive className="size-5" strokeWidth={2.25} />
              )}
              Archive
            </button>
          )}
        </div>
      </div>

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

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
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
              disabled={pending === "archive"}
              onClick={() => setArchiveOpen(false)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              disabled={pending === "archive"}
              onClick={archive}
            >
              {pending === "archive" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
