"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Ban,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/flight/ui/dropdown-menu";
import { Textarea } from "@/components/flight/ui/textarea";
import {
  approveAuthorisation,
  archiveAuthorisation,
  declineAuthorisation,
} from "@/lib/flight/actions/authorisations";
import { toastClearedToFly } from "@/lib/flight/toasts";
import { cn } from "@/lib/flight/utils";
import type { AuthorisationStatus } from "@/lib/flight/types";

interface QueueRowActionsProps {
  authorisationId: string;
  pilotName: string;
  status: AuthorisationStatus;
  /** Archive is admin-only. */
  canArchive?: boolean;
  /** Optional callback to override the default "Edit" link behaviour */
  onOpen?: () => void;
}

/**
 * Compact ⋮ menu for queue rows — quick decide without leaving the list.
 */
export function QueueRowActions({
  authorisationId,
  pilotName,
  status,
  canArchive: canArchiveProp = false,
  onOpen,
}: QueueRowActionsProps) {
  const router = useRouter();
  const href = `/fly/instructor/authorisations/${authorisationId}`;

  const canDecide = status === "submitted" || status === "pending";
  const canArchive =
    canArchiveProp &&
    (status === "submitted" || status === "pending" || status === "approved");

  const [pending, setPending] = useState<"approve" | "archive" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [declining, setDeclining] = useState(false);

  async function approve() {
    setPending("approve");
    const result = await approveAuthorisation({ authorisationId });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't approve.");
      return;
    }
    toastClearedToFly(pilotName);
    router.refresh();
  }

  async function decline() {
    setDeclining(true);
    const result = await declineAuthorisation({ authorisationId, reason });
    setDeclining(false);

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
      toast.error(result.error ?? "Couldn't archive.");
      return;
    }
    setArchiveOpen(false);
    toast.success("Authorisation archived");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:bg-muted hover:text-foreground"
            disabled={pending !== null}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-5" />
            )}
            <span className="sr-only">Actions for {pilotName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          {canDecide && (
            <DropdownMenuItem
              onSelect={(e: Event) => {
                e.preventDefault();
                void approve();
              }}
              className="gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium focus:bg-success-muted focus:text-foreground"
            >
              <ActionIcon className="bg-success-muted text-success">
                <Check className="size-4" strokeWidth={2.5} />
              </ActionIcon>
              Approve
            </DropdownMenuItem>
          )}
          {canDecide && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e: Event) => {
                e.preventDefault();
                setDeclineOpen(true);
              }}
              className="gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium focus:bg-danger-muted"
            >
              <ActionIcon className="bg-danger-muted text-destructive">
                <Ban className="size-4" strokeWidth={2.25} />
              </ActionIcon>
              Decline
            </DropdownMenuItem>
          )}
          {canArchive && (
            <DropdownMenuItem
              onSelect={(e: Event) => {
                e.preventDefault();
                setArchiveOpen(true);
              }}
              className="gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium focus:bg-warning-muted focus:text-foreground"
            >
              <ActionIcon className="bg-warning-muted text-warning-foreground">
                <Archive className="size-4" strokeWidth={2.25} />
              </ActionIcon>
              Archive
            </DropdownMenuItem>
          )}
          {(canDecide || canArchive) && (
            <DropdownMenuSeparator className="my-1.5" />
          )}
          {onOpen ? (
            <DropdownMenuItem
              onSelect={(e: Event) => {
                e.preventDefault();
                onOpen();
              }}
              className="gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium focus:bg-info-muted focus:text-foreground"
            >
              <ActionIcon className="bg-info-muted text-info">
                <Pencil className="size-4" strokeWidth={2.25} />
              </ActionIcon>
              View
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              asChild
              className="gap-3 rounded-lg px-2.5 py-2.5 text-[15px] font-medium focus:bg-info-muted focus:text-foreground"
            >
              <Link href={href}>
                <ActionIcon className="bg-info-muted text-info">
                  <Pencil className="size-4" strokeWidth={2.25} />
                </ActionIcon>
                View
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
            placeholder="e.g. Forecast crosswind exceeds your solo limit."
            rows={4}
            className="resize-none text-base sm:text-sm"
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeclineOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={decline}
              disabled={reason.trim().length < 3 || declining}
              className="gap-2"
            >
              {declining ? <Loader2 className="size-4 animate-spin" /> : null}
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
              Use this when {pilotName}&apos;s flight isn&apos;t going ahead. It
              will leave the active list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchiveOpen(false)}
              disabled={pending === "archive"}
            >
              Keep it
            </Button>
            <Button
              type="button"
              onClick={archive}
              disabled={pending === "archive"}
              className="gap-2"
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

function ActionIcon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
    >
      {children}
    </span>
  );
}
