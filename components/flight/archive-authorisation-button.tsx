"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
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
  archiveAuthorisation,
} from "@/lib/flight/actions/authorisations";
import { cn } from "@/lib/flight/utils";

interface ArchiveAuthorisationButtonProps {
  authorisationId: string;
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
  /** Full-width button for mobile layouts. */
  fullWidth?: boolean;
}

/**
 * Withdraw an open authorisation when the flight won't happen.
 * Admin-only — permission is enforced in the server action.
 * Confirm dialog keeps this from being a one-tap mistake on the apron.
 */
export function ArchiveAuthorisationButton({
  authorisationId,
  variant = "outline",
  className,
  fullWidth,
}: ArchiveAuthorisationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await archiveAuthorisation(authorisationId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't archive this authorisation.");
      return;
    }

    setOpen(false);
    toast.success("Authorisation archived");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={cn(fullWidth && "w-full", className)}
        onClick={() => setOpen(true)}
      >
        <Archive className="size-4" />
        Archive
      </Button>

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
            <Button type="button" disabled={pending} onClick={confirm}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
