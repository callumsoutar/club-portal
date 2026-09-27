"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/flight/utils";

interface ChecklistItemProps {
  id?: string;
  label: string;
  helpText?: string | null;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: boolean;
  optional?: boolean;
}

/**
 * One tap = confirm. Built for gloves, glare, and doing this quickly on the
 * apron — big hit target, obvious checked state, no duplicate checkmarks.
 */
export function ChecklistItem({
  id,
  label,
  helpText,
  checked,
  onCheckedChange,
  error,
  optional,
}: ChecklistItemProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={error || undefined}
      aria-describedby={helpText ? `${id}-help` : undefined}
      onClick={() => {
        onCheckedChange(!checked);
        // Subtle confirmation on devices that support it.
        if (!checked && typeof navigator !== "undefined") {
          navigator.vibrate?.(12);
        }
      }}
      className={cn(
        "group flex w-full items-start gap-3.5 rounded-2xl border px-3.5 py-3.5 text-left transition-all duration-200 select-none",
        "active:scale-[0.985] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        checked
          ? "border-foreground/20 bg-foreground/[0.04] shadow-xs"
          : "border-border/80 bg-card hover:border-foreground/25 hover:bg-background",
        error && !checked && "border-destructive/60 bg-danger-muted",
      )}
    >
      <span className="relative mt-0.5 shrink-0">
        <motion.span
          className={cn(
            "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
            checked
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground/35 bg-background group-hover:border-foreground/50",
          )}
          animate={checked ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          <AnimatePresence initial={false} mode="wait">
            {checked ? (
              <motion.span
                key="on"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            ) : (
              <motion.span
                key="off"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                className="size-4"
              />
            )}
          </AnimatePresence>
        </motion.span>
      </span>

      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "block text-[15px] leading-snug font-semibold tracking-tight transition-colors",
              checked ? "text-foreground" : "text-foreground",
            )}
          >
            {label}
          </span>
          {optional && !checked && (
            <span className="mt-0.5 shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Optional
            </span>
          )}
        </span>

        {helpText && (
          <span
            id={id ? `${id}-help` : undefined}
            className={cn(
              "block text-xs leading-relaxed transition-colors",
              checked ? "text-muted-foreground" : "text-muted-foreground",
            )}
          >
            {helpText}
          </span>
        )}

        {!checked && !helpText && (
          <span className="block text-xs text-muted-foreground/80">
            Tap to confirm
          </span>
        )}
      </span>
    </button>
  );
}
