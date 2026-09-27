"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/flight/utils";
import type { FieldOption } from "@/lib/flight/types";

interface OptionPickerProps {
  id?: string;
  value: string;
  options: FieldOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  emptyLabel?: string;
}

/**
 * Large tappable rows for short option lists (instructors, licence type, etc).
 * Prefer this over a Select on mobile when there are only a handful of choices.
 */
export function OptionPicker({
  id,
  value,
  options,
  onChange,
  invalid,
  emptyLabel = "Nothing available right now",
}: OptionPickerProps) {
  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      id={id}
      role="listbox"
      aria-invalid={invalid || undefined}
      className="grid gap-2"
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 select-none active:scale-[0.985]",
              selected
                ? "border-foreground/30 bg-foreground/[0.04] shadow-xs"
                : "border-border bg-background hover:border-foreground/20",
              invalid && !selected && "border-destructive/50",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold tracking-tight">
                {option.label}
              </span>
              {option.description && (
                <span className="block truncate text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>

            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card",
              )}
              aria-hidden
            >
              {selected && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
