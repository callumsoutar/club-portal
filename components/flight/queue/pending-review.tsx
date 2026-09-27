"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Check,
  Loader2,
  Phone,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/flight/status-badge";
import { QueueRowActions } from "@/components/flight/queue/row-actions";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/flight/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { Textarea } from "@/components/flight/ui/textarea";
import {
  approveAuthorisation,
  declineAuthorisation,
} from "@/lib/flight/actions/authorisations";
import { LICENCE_SHORT } from "@/lib/flight/constants";
import {
  AnswerSections,
  collectIssues,
} from "@/components/flight/authorisation/answer-sections";
import { type DataSources } from "@/lib/flight/form-engine";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  getAuthorisationFormName,
  getExpiryInfo,
  type ExpiryInfo,
} from "@/lib/flight/format";
import { toastClearedToFly } from "@/lib/flight/toasts";
import { cn } from "@/lib/flight/utils";
import type { AuthorisationWithRelations } from "@/lib/flight/types";

/** Queue item enriched server-side with a short-lived signed signature URL. */
export type PendingItem = AuthorisationWithRelations & {
  signatureSignedUrl: string | null;
};

interface PendingReviewProps {
  items: PendingItem[];
  /** Full rosters (including inactive) so historical answers still resolve. */
  sources: DataSources;
  /** Archive is admin-only. */
  canArchive?: boolean;
}

/**
 * Pending queue with a slide-out review panel.
 *
 * Table rows for a desk instructor: who, aircraft, exercise, and one
 * clear Review action. Colour is reserved for expired currency.
 */
export function PendingReview({
  items,
  sources,
  canArchive = false,
}: PendingReviewProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  function close() {
    setSelectedId(null);
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="h-11 w-[8rem] px-4 text-[13px] font-semibold text-foreground/80">
              Status
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Pilot / aircraft
            </TableHead>
            <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 lg:table-cell">
              Form
            </TableHead>
            <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 md:table-cell">
              Exercise
            </TableHead>
            <TableHead className="hidden h-11 w-32 px-4 text-[13px] font-semibold text-foreground/80 sm:table-cell">
              Waiting
            </TableHead>
            <TableHead className="h-11 w-14 px-3 text-right text-[13px] font-semibold text-foreground/80">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const medical = getExpiryInfo(item.pilot_medical_expiry);
              const bfr = getExpiryInfo(item.pilot_bfr_expiry);
              const expired =
                medical.state === "expired" || bfr.state === "expired";
              const registration =
                item.aircraft?.registration ??
                item.aircraft_registration ??
                "Aircraft TBC";
              const formName = getAuthorisationFormName(item.template_snapshot);

              return (
              <TableRow
                key={item.id}
                className={cn(
                  "cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30",
                  expired && "bg-danger-muted/20 hover:bg-danger-muted/30",
                )}
                onClick={() => setSelectedId(item.id)}
              >
                  <TableCell className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={item.status} size="sm" live />
                      {expired && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-danger-muted px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                          <AlertTriangle className="size-3" />
                          Currency
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.pilot_name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {registration}
                        {item.aircraft?.aircraft_type
                          ? ` · ${item.aircraft.aircraft_type}`
                          : ""}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground lg:hidden">
                        {formName}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground md:hidden">
                        {item.exercise ?? "No exercise"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[14rem] px-4 py-3.5 lg:table-cell">
                    <span className="line-clamp-2 text-sm text-foreground/80">
                      {formName}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-[14rem] truncate px-4 py-3.5 text-sm text-muted-foreground md:table-cell">
                    {item.exercise ?? "—"}
                  </TableCell>
                  <TableCell className="hidden px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap sm:table-cell">
                    {item.submitted_at
                      ? formatRelative(item.submitted_at)
                      : "—"}
                  </TableCell>
                  <TableCell
                    className="px-3 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QueueRowActions
                      authorisationId={item.id}
                      pilotName={item.pilot_name}
                      status={item.status}
                      canArchive={canArchive}
                      onOpen={() => setSelectedId(item.id)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open: boolean) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex h-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[min(42rem,94vw)]"
        >
          {selected && (
            <ReviewPanel
              key={selected.id}
              item={selected}
              sources={sources}
              onDone={close}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ReviewPanel({
  item,
  sources,
  onDone,
}: {
  item: PendingItem;
  sources: DataSources;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<"approve" | "decline" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  const bfr = getExpiryInfo(item.pilot_bfr_expiry);
  const medical = getExpiryInfo(item.pilot_medical_expiry);
  const expiredCurrency = bfr.state === "expired" || medical.state === "expired";

  const expiryByKey: Record<string, ExpiryInfo> = {
    bfr_expiry: bfr,
    medical_expiry: medical,
  };

  const issues = collectIssues(
    item.template_snapshot,
    item.answers,
    expiryByKey,
  );

  async function approve() {
    setPending("approve");
    const result = await approveAuthorisation({ authorisationId: item.id });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't approve.");
      return;
    }
    toastClearedToFly(item.pilot_name);
    onDone();
  }

  async function decline() {
    setPending("decline");
    const result = await declineAuthorisation({
      authorisationId: item.id,
      reason,
    });
    setPending(null);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't decline.");
      return;
    }
    setDeclineOpen(false);
    toast.success("Authorisation declined");
    onDone();
  }

  const registration =
    item.aircraft?.registration ?? item.aircraft_registration ?? "—";
  const licence = item.pilot_licence_type
    ? LICENCE_SHORT[item.pilot_licence_type]
    : "No licence";
  const aircraftType = item.aircraft?.aircraft_type;
  const formName = getAuthorisationFormName(item.template_snapshot);

  return (
    <>
      {/* Explicit Close — labeled + large touch target so it isn't confused with Decline. */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5 sm:px-5">
        <SheetClose asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 rounded-xl px-3.5 text-sm font-medium"
          >
            <X className="size-4" strokeWidth={2.25} />
            Close
          </Button>
        </SheetClose>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <StatusBadge status={item.status} live />
          <Button
            asChild
            variant="ghost"
            className="h-10 gap-1 rounded-xl px-2.5 text-sm text-muted-foreground"
          >
            <Link href={`/fly/instructor/authorisations/${item.id}`}>
              Full review
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <SheetHeader className="space-y-0 shrink-0 border-b p-0 text-left">
        <div className="px-5 pt-4 pr-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Submitted {formatRelative(item.submitted_at)}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-[1.375rem] leading-tight font-semibold tracking-tight">
                {item.pilot_name}
              </SheetTitle>
              <SheetDescription className="mt-1 text-[13px] text-muted-foreground">
                {licence}
                <span className="mx-1.5 text-border">·</span>
                <span className="font-mono font-medium text-[12px] text-purple-700 dark:text-purple-400">
                  {item.reference}
                </span>
              </SheetDescription>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formName}
              </p>
            </div>

            {item.pilot_phone && (
              <Button
                asChild
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-xl"
              >
                <a href={`tel:${item.pilot_phone}`} aria-label="Call pilot">
                  <Phone className="size-4" />
                </a>
              </Button>
            )}
          </div>

          {/* Flight summary — registration leads, supporting facts trail. */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-lg leading-none font-semibold tracking-tight">
                {registration}
              </p>
              {aircraftType && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {aircraftType}
                </p>
              )}
            </div>

            <div className="shrink-0 space-y-1 text-right text-sm">
              {item.exercise && (
                <p className="font-medium tracking-tight">{item.exercise}</p>
              )}
              <p className="text-muted-foreground">
                {formatDate(item.flight_date, "EEE d MMM")}
              </p>
            </div>
          </div>

          {/* Currency at a glance — days remaining / past for BFR & medical. */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <CurrencyChip label="BFR" info={bfr} />
            <CurrencyChip label="Medical" info={medical} />
          </div>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
        {issues.length > 0 && (
          <div className="flex gap-3 rounded-xl bg-danger-muted px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-destructive">
                Needs attention
              </p>
              {issues.map((issue) => (
                <p key={issue} className="text-sm text-destructive/90">
                  {issue}
                </p>
              ))}
            </div>
          </div>
        )}

        <AnswerSections
          template={item.template_snapshot}
          answers={item.answers}
          sources={sources}
          expiryByKey={expiryByKey}
        />

        {item.signatureSignedUrl && (
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Signature</h3>
            </div>
            <div className="relative mx-4 my-4 h-24 overflow-hidden rounded-lg border bg-white">
              <Image
                src={item.signatureSignedUrl}
                alt={`Signature of ${item.pilot_name}`}
                fill
                unoptimized
                className="object-contain p-3"
              />
            </div>
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              Signed {formatDateTime(item.signed_at)}
            </p>
          </section>
        )}
      </div>

      {/* Single action row: decisions only — navigation lives in the header. */}
      <div className="pb-safe shrink-0 border-t bg-background/95 px-5 pt-3.5 pb-3.5 backdrop-blur-xl">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setDeclineOpen(true)}
            disabled={pending !== null}
            className="h-12 min-w-[7.5rem] gap-2 rounded-xl text-base font-medium text-muted-foreground hover:bg-danger-muted hover:text-destructive"
          >
            <Ban className="size-4" strokeWidth={2.25} />
            Decline
          </Button>

          <Button
            onClick={approve}
            disabled={pending !== null}
            className={cn(
              "h-12 flex-1 gap-2 rounded-xl text-base font-semibold",
              expiredCurrency &&
                "bg-warning text-warning-foreground hover:bg-warning/90",
            )}
          >
            {pending === "approve" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" strokeWidth={2.5} />
            )}
            {expiredCurrency ? "Approve anyway" : "Approve"}
          </Button>
        </div>
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this authorisation</DialogTitle>
            <DialogDescription>
              {item.pilot_name} will see your reason, so be specific about what
              needs to change.
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
              className="gap-2"
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

function CurrencyChip({ label, info }: { label: string; info: ExpiryInfo }) {
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5",
        info.state === "expired" && "bg-danger-muted",
        info.state === "expiring" && "bg-warning-muted",
        info.state === "valid" && "bg-success-muted/70",
        info.state === "unknown" && "bg-muted",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold tracking-wide uppercase",
          info.state === "expired"
            ? "text-destructive/80"
            : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          info.state === "expired" && "text-destructive",
          info.state === "expiring" && "text-warning-foreground",
          info.state === "valid" && "text-success",
          info.state === "unknown" && "text-muted-foreground",
        )}
      >
        {info.label}
      </p>
    </div>
  );
}
