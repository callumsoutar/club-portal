"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { QueueRowActions } from "@/components/flight/queue/row-actions";
import { StatusBadge } from "@/components/flight/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { LICENCE_SHORT } from "@/lib/flight/constants";
import {
  formatDate,
  formatRelative,
  getAuthorisationFormName,
  getExpiryInfo,
} from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";
import type { AuthorisationWithRelations } from "@/lib/flight/types";

/**
 * Desktop queue. Dense but not cramped — an instructor scanning this should be
 * able to triage without opening anything.
 */
export function QueueTable({
  rows,
  canArchive = false,
}: {
  rows: AuthorisationWithRelations[];
  canArchive?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="h-11 w-[20%] px-4 text-[13px] font-semibold text-foreground/80">
              Pilot
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Form
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Aircraft
            </TableHead>
            <TableHead className="h-11 w-[18%] px-4 text-[13px] font-semibold text-foreground/80">
              Exercise
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Date
            </TableHead>
            <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 lg:table-cell">
              Instructor
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Submitted
            </TableHead>
            <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
              Status
            </TableHead>
            <TableHead className="h-11 w-14 px-3 text-right text-[13px] font-semibold text-foreground/80">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((a) => {
            const href = `/fly/instructor/authorisations/${a.id}`;

            const bfr = getExpiryInfo(a.pilot_bfr_expiry);
            const medical = getExpiryInfo(a.pilot_medical_expiry);
            const currencyIssue =
              bfr.state === "expired" || medical.state === "expired";
            const formName = getAuthorisationFormName(a.template_snapshot);

            return (
              <TableRow
                key={a.id}
                className={cn(
                  "cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30",
                  currencyIssue && "bg-danger-muted/20 hover:bg-danger-muted/30",
                )}
                onClick={() => router.push(href)}
              >
                <TableCell className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {a.pilot_name}
                    {currencyIssue && (
                      <AlertTriangle
                        className="size-3.5 text-destructive"
                        aria-label="Currency expired"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {a.pilot_licence_type
                      ? LICENCE_SHORT[a.pilot_licence_type]
                      : "Licence not stated"}
                    {" · "}
                    <span className="font-mono font-medium text-purple-700 dark:text-purple-400">
                      {a.reference}
                    </span>
                  </span>
                </TableCell>

                <TableCell className="max-w-[12rem] px-4 py-3.5">
                  <span className="line-clamp-2 text-sm text-foreground/80">
                    {formName}
                  </span>
                </TableCell>

                <TableCell className="px-4 py-3.5">
                  <span className="font-mono text-sm font-medium">
                    {a.aircraft?.registration ??
                      a.aircraft_registration ??
                      "—"}
                  </span>
                </TableCell>

                <TableCell className="max-w-0 truncate px-4 py-3.5 text-sm text-muted-foreground">
                  {a.exercise ?? "—"}
                </TableCell>

                <TableCell className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(a.flight_date, "d MMM")}
                </TableCell>

                <TableCell className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
                  {a.instructor?.full_name ?? "Unassigned"}
                </TableCell>

                <TableCell className="px-4 py-3.5 text-xs whitespace-nowrap text-muted-foreground">
                  {formatRelative(a.submitted_at)}
                </TableCell>

                <TableCell className="px-4 py-3.5">
                  <StatusBadge status={a.status} size="sm" live />
                </TableCell>

                <TableCell
                  className="px-3 py-3.5 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <QueueRowActions
                    authorisationId={a.id}
                    pilotName={a.pilot_name}
                    status={a.status}
                    canArchive={canArchive}
                    onOpen={() => router.push(href)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
