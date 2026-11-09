"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { ClearSignoffButton, SignoffButton } from "@/components/ccat/record-dialogs";
import { StatusPill } from "@/components/ccat/student-record";
import { Input } from "@/components/flight/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/flight/ui/tooltip";
import type { ItemProgress, SignoffStamp } from "@/lib/ccat/progress";
import { formatDate } from "@/lib/flight/format";
import { cn } from "@/lib/utils";

export function SyllabusTable({
  rows,
  staff,
  studentId,
  today,
  instructors,
  defaultInstructorId,
  empty = "Nothing in this view.",
  searchPlaceholder,
}: {
  rows: ItemProgress[];
  staff: boolean;
  studentId: string;
  today: string;
  instructors: { id: string; name: string }[];
  defaultInstructorId: string;
  empty?: string;
  /** When set, a search field filters this table by name, instructor, and date. */
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!needle) return rows;
    return rows.filter((row) => haystack(row).includes(needle));
  }, [needle, rows]);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  const delivery = rows.every((row) => row.item.signoffMode === "delivery");
  const paired = !delivery && rows.some((row) => row.item.signoffMode === "learnt_taught");
  const nextLearnId = rows.find((row) => row.item.signoffMode === "learnt_taught" && !row.learnt)?.item.id;
  const nextTeachId = rows.find((row) => row.item.signoffMode === "learnt_taught" && row.learnt && !row.taught)?.item.id;
  const nextSingleId = rows.find((row) => row.item.signoffMode === "single" && !row.completed)?.item.id;
  const nextReceivedId = rows.find((row) => row.item.signoffMode === "delivery" && !row.received)?.item.id;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm shadow-foreground/[0.03]">
      {searchPlaceholder ? (
        <div className="flex min-h-14 items-center gap-3 border-b bg-muted/20 px-4 py-2.5">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 border-transparent bg-background pl-8 text-sm shadow-sm focus-visible:border-ring"
            />
          </div>
          {needle ? (
            <p className="ml-auto text-xs text-muted-foreground tabular-nums">
              {visible.length} of {rows.length}
            </p>
          ) : null}
        </div>
      ) : null}
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">No records match this search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={cn(
            "w-full text-sm [&_th:not(:last-child)]:border-r [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-border/60 [&_td:not(:last-child)]:border-border/60",
            delivery ? "min-w-[68rem] [&_th:nth-child(n+4)]:bg-muted/15 [&_td:nth-child(n+4)]:bg-muted/10" : "min-w-[40rem]",
          )}>
            <thead>
              <tr className="border-b bg-muted/30 text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="w-32 px-4 py-3 font-semibold">Status</th>
                <th className="min-w-56 px-4 py-3 font-semibold">Item</th>
                <th className="min-w-56 px-4 py-3 font-semibold">{delivery ? "Received" : paired ? "Learnt" : "Signed off"}</th>
                {delivery ? Array.from({ length: 4 }, (_, index) => (
                  <th key={index} className="min-w-40 px-2 py-3 text-center font-semibold">Delivery {index + 1}</th>
                )) : null}
                {paired ? <th className="min-w-56 px-4 py-3 font-semibold">Taught</th> : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const single = row.item.signoffMode === "single";
                const next =
                  row.item.id === nextLearnId ||
                  row.item.id === nextTeachId ||
                  row.item.id === nextSingleId ||
                  row.item.id === nextReceivedId;
                return (
                  <tr key={row.item.id} className={cn("border-b align-middle last:border-b-0 hover:bg-muted/25", next && "bg-primary/[0.035]")}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill status={row.status} className="h-6 px-2.5 text-[11px]" />
                    </td>
                    <td className="px-4 py-3 font-medium leading-snug text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {row.item.name}
                        {next ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Next</span> : null}
                        {!row.item.isActive ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Retired</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.item.signoffMode === "delivery" ? (
                        <Stamp
                          stamp={row.received}
                          staff={staff}
                          empty={
                            <SignoffButton
                              studentId={studentId}
                              itemId={row.item.id}
                              itemName={row.item.name}
                              kind="received"
                              today={today}
                              instructors={instructors}
                              defaultInstructorId={defaultInstructorId}
                              label="Mark received"
                              emphasis={row.item.id === nextReceivedId}
                            />
                          }
                        />
                      ) : single ? (
                        <Stamp
                          stamp={row.completed}
                          staff={staff}
                          empty={
                            <SignoffButton
                              studentId={studentId}
                              itemId={row.item.id}
                              itemName={row.item.name}
                              kind="completed"
                              today={today}
                              instructors={instructors}
                              defaultInstructorId={defaultInstructorId}
                              label="Sign off"
                              emphasis={row.item.id === nextSingleId}
                            />
                          }
                        />
                      ) : (
                        <Stamp
                          stamp={row.learnt}
                          staff={staff}
                          empty={
                            staff ? (
                              <SignoffButton
                                studentId={studentId}
                                itemId={row.item.id}
                                itemName={row.item.name}
                                kind="learnt"
                                today={today}
                                instructors={instructors}
                                defaultInstructorId={defaultInstructorId}
                                label="Mark as learnt"
                                emphasis={row.item.id === nextLearnId}
                              />
                            ) : (
                              "—"
                            )
                          }
                        />
                      )}
                    </td>
                    {delivery ? (
                      Array.from({ length: 4 }, (_, index) => {
                        const stamp = row.deliveries[index];
                        return (
                          <td key={index} className="px-2 py-2.5 text-center">
                            {stamp ? (
                              <DeliveryCell stamps={index === 3 ? row.deliveries.slice(index) : [stamp]} staff={staff} />
                            ) : staff && index === row.deliveries.length ? (
                              <SignoffButton
                                studentId={studentId}
                                itemId={row.item.id}
                                itemName={row.item.name}
                                kind="delivered"
                                today={today}
                                instructors={instructors}
                                defaultInstructorId={defaultInstructorId}
                                label="Record delivery"
                                underline
                              />
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })
                    ) : null}
                    {paired ? (
                      <td className="px-4 py-2.5">
                        {single ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Stamp
                            stamp={row.taught}
                            staff={staff}
                            empty={
                              staff ? (
                                <SignoffButton
                                  studentId={studentId}
                                  itemId={row.item.id}
                                  itemName={row.item.name}
                                  kind="taught"
                                  today={today}
                                  instructors={instructors}
                                  defaultInstructorId={defaultInstructorId}
                                  label="Mark as taught"
                                  emphasis={row.item.id === nextTeachId}
                                />
                              ) : (
                                "—"
                              )
                            }
                          />
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeliveryCell({ stamps, staff }: { stamps: SignoffStamp[]; staff: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {stamps.map((stamp) => (
        <Tooltip key={stamp.eventId}>
          <TooltipTrigger asChild>
            <span tabIndex={stamp.notes ? 0 : undefined} className="inline-flex items-center justify-center gap-1.5 text-xs whitespace-nowrap">
              <Check className="size-3.5 text-success" aria-label="Delivered" />
              <span className="font-semibold text-foreground">{instructorInitials(stamp.instructorName)}</span>
              <span className="text-muted-foreground tabular-nums">{formatDate(stamp.date)}</span>
              {staff ? <ClearSignoffButton id={stamp.eventId} /> : null}
            </span>
          </TooltipTrigger>
          {stamp.notes ? <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">{stamp.notes}</TooltipContent> : null}
        </Tooltip>
      ))}
    </div>
  );
}

function instructorInitials(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length ? parts.map((part) => part[0]).join("").toUpperCase() : "?";
}

function haystack(row: ItemProgress) {
  const stamps = [row.learnt, row.taught, row.completed, row.received, ...row.deliveries];
  const recorded = stamps.flatMap((stamp) =>
    stamp ? [formatDate(stamp.date), stamp.date, stamp.instructorName ?? "", stamp.notes ?? ""] : [],
  );
  return [row.item.name, row.status, ...recorded].join(" ").toLowerCase();
}

function Stamp({
  stamp,
  staff,
  empty,
}: {
  stamp: SignoffStamp | null;
  staff: boolean;
  empty: React.ReactNode;
}) {
  if (!stamp) return staff ? empty : <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
      <span className="font-medium text-foreground tabular-nums">{formatDate(stamp.date)}</span>
      <span className="text-muted-foreground">· {stamp.instructorName || "Instructor not recorded"}</span>
      {staff ? (
        <ClearSignoffButton id={stamp.eventId} />
      ) : null}
    </span>
  );
}
