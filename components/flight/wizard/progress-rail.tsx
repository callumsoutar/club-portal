"use client";

import { Check, Plane } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/flight/utils";

interface ProgressRailProps {
  steps: { key: string; title: string }[];
  current: number;
  /** Steps the pilot has already validated — safe to jump back to. */
  completed: Set<number>;
  onStepSelect: (index: number) => void;
  /** Shown under the mobile bar so pilots always know where they are. */
  currentTitle?: string;
}

/**
 * Progress indicator.
 *
 * On mobile this is a single continuous bar with a step counter — a row of
 * seven labelled dots on a 375px screen is illegible. On desktop, where there
 * is room, it becomes a proper clickable rail.
 */
export function ProgressRail({
  steps,
  current,
  completed,
  onStepSelect,
  currentTitle,
}: ProgressRailProps) {
  const percent = ((current + 1) / steps.length) * 100;

  return (
    <div className="space-y-2.5">
      {/* Mobile: bar + step label. */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold tracking-tight">
            {currentTitle ?? steps[current]?.title}
          </p>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {current + 1}
            <span className="text-border"> / </span>
            {steps.length}
          </span>
        </div>

        <div className="relative h-2 rounded-full bg-border/80">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
          />
          <motion.span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground"
            initial={false}
            animate={{ left: `${percent}%` }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
            aria-hidden
          >
            <span className="flex size-6 items-center justify-center rounded-full border bg-card shadow-sm">
              <Plane
                className="size-3 rotate-45"
                fill="currentColor"
                strokeWidth={0}
              />
            </span>
          </motion.span>
        </div>
      </div>

      {/* Desktop */}
      <nav className="hidden md:block" aria-label="Progress">
        <ol className="flex items-center gap-1">
          {steps.map((step, index) => {
            const isDone = completed.has(index) && index !== current;
            const isCurrent = index === current;
            const reachable = isDone || index <= current;

            return (
              <li key={step.key} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => reachable && onStepSelect(index)}
                  disabled={!reachable}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "group flex flex-1 flex-col gap-2 rounded-lg py-1 text-left transition-opacity",
                    reachable ? "cursor-pointer" : "cursor-default opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-full rounded-full transition-colors duration-300",
                      isCurrent || isDone ? "bg-foreground" : "bg-border",
                    )}
                  />
                  <span className="flex items-center gap-1.5">
                    {isDone && (
                      <Check
                        className="size-3 text-foreground"
                        strokeWidth={3}
                      />
                    )}
                    <span
                      className={cn(
                        "truncate text-xs font-medium transition-colors",
                        isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {step.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
