"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { EditFlightButton, RemoveFlightButton } from "@/components/ccat/log-flight-dialog";
import { Input } from "@/components/flight/ui/input";
import type { FlightFormContext } from "@/lib/ccat/present";
import type { CcatFlight } from "@/lib/ccat/types";

export type FlightLogEntry = {
  flight: CcatFlight;
  studentName: string;
  studentHref: string | null;
  dateLabel: string;
  aircraft: string;
  instructor: string;
  dual: string;
  solo: string;
};

export function FlightLog({
  entries,
  context,
}: {
  entries: FlightLogEntry[];
  context: FlightFormContext;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!needle) return entries;
    return entries.filter((entry) => {
      const exercises = [...entry.flight.taught, ...entry.flight.learnt].join(" ");
      return `${entry.studentName} ${entry.aircraft} ${entry.instructor} ${entry.dateLabel} ${exercises} ${entry.flight.notes ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, needle]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {visible.length === 1 ? "1 flight" : `${visible.length} flights`}
        </p>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student, aircraft, exercise"
            aria-label="Search the flight log"
            className="h-8 bg-card pl-8 text-sm"
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          {entries.length === 0 ? "No flights recorded yet." : "No flights match this search."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[6.5rem]" />
              <col className="w-[16%]" />
              <col className="w-[5.25rem]" />
              <col className="w-[14%]" />
              <col className="w-[3.25rem]" />
              <col className="w-[3.25rem]" />
              <col />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Aircraft</th>
                <th className="px-3 py-2 font-medium">Instructor</th>
                <th className="px-2 py-2 text-right font-medium">Dual</th>
                <th className="px-2 py-2 text-right font-medium">Solo</th>
                <th className="px-3 py-2 font-medium">Exercises</th>
                <th className="px-2 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const detail = exerciseDetail(entry.flight.taught, entry.flight.learnt);
                return (
                  <tr key={entry.flight.id} className="border-b align-middle last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{entry.dateLabel}</td>
                    <td className="truncate px-3 py-1.5 font-medium">
                      {entry.studentHref ? (
                        <Link href={entry.studentHref} className="hover:underline" title={entry.studentName}>
                          {entry.studentName}
                        </Link>
                      ) : (
                        entry.studentName
                      )}
                    </td>
                    <td className="truncate px-3 py-1.5">{entry.aircraft}</td>
                    <td className="truncate px-3 py-1.5 text-muted-foreground" title={entry.instructor}>
                      {entry.instructor}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{entry.dual}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{entry.solo}</td>
                    <td className="px-3 py-1.5">
                      <p className="truncate text-xs text-muted-foreground" title={detail || entry.flight.notes || undefined}>
                        {detail || "No exercises"}
                      </p>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex justify-end">
                        <EditFlightButton context={context} flight={entry.flight} compact />
                        <RemoveFlightButton id={entry.flight.id} compact />
                      </div>
                    </td>
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

function exerciseDetail(taught: string[], learnt: string[]) {
  const parts = [
    taught.length ? `Taught ${taught.join(", ")}` : null,
    learnt.length ? `Learnt ${learnt.join(", ")}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}
