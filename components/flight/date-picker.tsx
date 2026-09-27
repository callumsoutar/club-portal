"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { Calendar } from "@/components/flight/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/flight/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/flight/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/flight/utils";

export type DatePickerMode = "flight" | "expiry";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  /** `flight` = near-term; `expiry` = wide year range for currency docs. */
  mode?: DatePickerMode;
  /** Show a clear control when a value is set. */
  clearable?: boolean;
  label?: string;
}

/** Parse yyyy-MM-dd as a local calendar day (avoids UTC shift from parseISO). */
function parseLocalDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return undefined;
  }
  return date;
}

function toValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function rangeForMode(mode: DatePickerMode) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (mode === "expiry") {
    return {
      startMonth: startOfMonth(new Date(year - 2, 0)),
      endMonth: endOfMonth(new Date(year + 6, 11)),
      defaultMonth: now,
    };
  }

  return {
    startMonth: startOfMonth(new Date(year, month - 1)),
    endMonth: endOfMonth(new Date(year, month + 6)),
    defaultMonth: now,
  };
}

/**
 * Touch-friendly date field.
 *
 * Native `type="date"` is awkward on phones (tiny spinners, hard year jumps).
 * This opens a bottom sheet on mobile / popover on desktop, with month + year
 * dropdowns so pilots can jump to an expiry date in two taps.
 */
export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  invalid,
  className,
  mode = "flight",
  clearable = false,
  label,
}: DatePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseLocalDate(value), [value]);
  const { startMonth, endMonth, defaultMonth } = useMemo(
    () => rangeForMode(mode),
    [mode],
  );

  const today = new Date();
  const tomorrow = addDays(today, 1);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) onBlur?.();
  }

  function selectDate(date: Date | undefined) {
    if (!date) {
      onChange("");
      return;
    }
    onChange(toValue(date));
    setOpen(false);
    onBlur?.();
  }

  function clear(e?: SyntheticEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    onChange("");
    setOpen(false);
    onBlur?.();
  }

  const triggerButton = (
    <button
      id={id}
      type="button"
      aria-invalid={invalid}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className={cn(
        "flex h-14 w-full items-center gap-3 rounded-2xl border border-border bg-background px-3.5 text-left text-base shadow-xs transition-colors outline-none select-none",
        "hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "active:scale-[0.99] sm:h-12 sm:rounded-xl sm:text-sm",
        open && "border-foreground/25",
        invalid && "border-destructive ring-3 ring-destructive/20",
        className,
      )}
    >
      <CalendarIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium",
          !selected && "font-normal text-muted-foreground",
        )}
      >
        {selected ? format(selected, "EEE d MMM yyyy") : placeholder}
      </span>
      {clearable && selected ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear date"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={clear}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") clear(e);
          }}
        >
          <X className="size-3.5" />
        </span>
      ) : null}
    </button>
  );

  const calendar = (
    <div className="flex w-full flex-col gap-3">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={selectDate}
        defaultMonth={selected ?? defaultMonth}
        captionLayout="dropdown"
        startMonth={startMonth}
        endMonth={endMonth}
        className="w-full [--cell-size:--spacing(11)] sm:[--cell-size:--spacing(9)]"
      />

      {mode === "flight" && (
        <div className="flex flex-wrap gap-2 px-1 pb-1">
          <QuickChip
            label="Today"
            active={value === toValue(today)}
            onClick={() => selectDate(today)}
          />
          <QuickChip
            label="Tomorrow"
            active={value === toValue(tomorrow)}
            onClick={() => selectDate(tomorrow)}
          />
        </div>
      )}

      {clearable && selected ? (
        <div className="px-1 pb-1">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full rounded-xl text-muted-foreground"
            onClick={() => clear()}
          >
            Clear date
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="border-b pb-3">
              <DrawerTitle>{label ?? "Choose a date"}</DrawerTitle>
              <DrawerDescription>
                Tap the month or year to jump quickly, then pick the day.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex justify-center overflow-x-auto px-3 pt-2 pb-4">
              {calendar}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto max-w-[calc(100vw-1.5rem)] p-3"
      >
        {calendar}
      </PopoverContent>
    </Popover>
  );
}

function QuickChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors active:scale-[0.97]",
        active
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/25",
      )}
    >
      {label}
    </button>
  );
}

/** Infer a sensible year range from the form field key. */
export function datePickerModeForKey(key: string): DatePickerMode {
  if (/expir|valid_until|due/i.test(key)) return "expiry";
  return "flight";
}
