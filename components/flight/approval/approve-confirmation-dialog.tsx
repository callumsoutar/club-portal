"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/flight/ui/button";
import { Checkbox } from "@/components/flight/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/flight/ui/dialog";

export function ApproveConfirmationDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (sendConfirmationEmail: boolean) => void;
}) {
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);

  useEffect(() => {
    if (open) setSendConfirmationEmail(true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve this authorisation?</DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this authorisation?
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
          <Checkbox
            checked={sendConfirmationEmail}
            onCheckedChange={(checked) =>
              setSendConfirmationEmail(checked === true)
            }
            disabled={pending}
            className="mt-0.5"
          />
          <span className="space-y-0.5">
            <span className="block font-medium">
              Send confirmation email to pilot
            </span>
            <span className="block text-muted-foreground">
              Let them know they&apos;re cleared to fly.
            </span>
          </span>
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(sendConfirmationEmail)}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
