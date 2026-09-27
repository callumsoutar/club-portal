"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/flight/ui/tabs";
import { cn } from "@/lib/flight/utils";
import type { Aircraft, Instructor } from "@/lib/flight/types";

interface QueueFiltersProps {
  aircraft: Aircraft[];
  instructors: Instructor[];
}

const STATUS_PRESETS: { label: string; value: string }[] = [
  { label: "Needs review", value: "submitted,pending" },
  { label: "Airborne", value: "approved" },
  { label: "Approved", value: "approved,completed" },
  { label: "Declined", value: "declined" },
  { label: "All", value: "all" },
];

/**
 * Filters live in the URL so instructors can bookmark and share views.
 */
export function QueueFilters({ aircraft, instructors }: QueueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => update("q", search), 350);
    return () => clearTimeout(timer);
  }, [search, searchParams, update]);

  const activeStatus = searchParams.get("status") ?? "submitted,pending";
  const hasFilters = ["q", "aircraft", "instructor", "licence"].some((k) =>
    searchParams.get(k),
  );

  return (
    <div className="space-y-3 border-b border-border/70 pb-4">
      <Tabs
        value={activeStatus}
        onValueChange={(value: string) => update("status", value)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0"
        >
          {STATUS_PRESETS.map((preset) => (
            <TabsTrigger
              key={preset.label}
              value={preset.value}
              className="flex-none rounded-none px-3 py-2 text-sm after:inset-x-3 data-[state=active]:bg-transparent"
            >
              {preset.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pilot, reference, aircraft…"
            className="h-9 bg-background pl-8 text-sm shadow-none"
            aria-label="Search authorisations"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={searchParams.get("aircraft") ?? ""}
            onChange={(v) => update("aircraft", v)}
            placeholder="Aircraft"
            options={aircraft.map((a) => ({
              value: a.id,
              label: a.display_name || a.registration,
            }))}
          />

          <FilterSelect
            value={searchParams.get("instructor") ?? ""}
            onChange={(v) => update("instructor", v)}
            placeholder="Instructor"
            options={instructors.map((i) => ({
              value: i.id,
              label: i.full_name,
            }))}
          />

          <FilterSelect
            value={searchParams.get("licence") ?? ""}
            onChange={(v) => update("licence", v)}
            placeholder="Licence"
            options={LICENCE_OPTIONS}
          />

          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                startTransition(() =>
                  router.replace(`${pathname}?status=${activeStatus}`, {
                    scroll: false,
                  }),
                );
              }}
              className="h-9 px-2 text-muted-foreground"
            >
              Clear
            </Button>
          ) : null}

          {pending ? (
            <span className="text-xs text-muted-foreground">Updating…</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const LICENCE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "rpl", label: "RPL" },
  { value: "ppl", label: "PPL" },
  { value: "cpl", label: "CPL" },
  { value: "atpl", label: "ATPL" },
  { value: "instructor", label: "Instructor" },
];

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value || "__all"}
      onValueChange={(v: string) => onChange(v === "__all" ? "" : v)}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-auto min-w-[7.5rem] bg-background text-sm shadow-none",
          !value && "text-muted-foreground",
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">Any {placeholder.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
