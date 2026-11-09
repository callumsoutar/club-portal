"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ClearSignoffButton, SignoffButton } from "@/components/ccat/record-dialogs";
import { StatusPill } from "@/components/ccat/student-record";
import { Input } from "@/components/flight/ui/input";
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
    <div className="overflow-hidden rounded-xl border bg-card">
      {searchPlaceholder ? (
        <div className="flex items-center gap-3 border-b px-3 py-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 bg-background pl-8 text-sm"
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
          <table className={cn("w-full text-sm", delivery ? "min-w-[52rem]" : "min-w-[40rem]")}>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">{delivery ? "Received" : paired ? "Learnt" : "Signed off"}</th>
                {delivery ? <th className="px-3 py-2 font-medium">Delivered</th> : null}
                {paired ? <th className="px-3 py-2 font-medium">Taught</th> : null}
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
                  <tr key={row.item.id} className={cn("border-b align-middle last:border-b-0", next && "bg-primary/5")}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {row.item.name}
                        {next ? <span className="text-[11px] font-medium text-primary">Next</span> : null}
                        {!row.item.isActive ? <span className="text-xs font-normal text-muted-foreground">Retired</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-2">
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
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.deliveries.map((deliveryStamp) => (
                            <Stamp key={deliveryStamp.eventId} stamp={deliveryStamp} staff={staff} empty={null} />
                          ))}
                          {staff ? (
                            <SignoffButton
                              studentId={studentId}
                              itemId={row.item.id}
                              itemName={row.item.name}
                              kind="delivered"
                              today={today}
                              instructors={instructors}
                              defaultInstructorId={defaultInstructorId}
                              label="Record delivery"
                            />
                          ) : row.deliveries.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    {paired ? (
                      <td className="px-3 py-2">
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
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs whitespace-nowrap">
      <span className="font-medium text-foreground tabular-nums">{formatDate(stamp.date)}</span>
      <span className="text-muted-foreground">{stamp.instructorName || "Instructor not recorded"}</span>
      {staff ? (
        <span className="border-l pl-1.5">
          <ClearSignoffButton id={stamp.eventId} />
        </span>
      ) : null}
    </span>
  );
}
