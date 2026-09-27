"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";

import { Input } from "@/components/flight/ui/input";
import { formatTimeLabel, parseFlexibleTime } from "@/lib/flight/format";
import { cn } from "@/lib/flight/utils";

interface TimeInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * Simple ETA field. Type "1415", "2:15pm", or "14:15" — stored as `HH:mm`.
 */
export function TimeInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "e.g. 1415 or 2:15pm",
  invalid,
  className,
}: TimeInputProps) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Keep local draft text in sync when the form value changes externally.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== parseFlexibleTime(text)) {
      setText(value);
    }
  }

  const parsed = useMemo(() => parseFlexibleTime(text), [text]);

  function handleChange(next: string) {
    setText(next);
    const normalised = parseFlexibleTime(next);
    if (normalised) onChange(normalised);
    else if (next.trim() === "") onChange("");
  }

  function handleBlur() {
    if (parsed) {
      setText(parsed);
      onChange(parsed);
    } else if (text.trim() !== "") {
      // Keep the typed text visible but clear the form value so validation fires.
      onChange("");
    }
    onBlur?.();
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <Clock
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleBlur();
            }
          }}
          placeholder={placeholder}
          aria-invalid={invalid}
          className="h-14 rounded-2xl border-border bg-background pr-4 pl-11 text-base shadow-xs focus-visible:bg-background sm:h-12 sm:rounded-xl sm:text-sm"
        />
      </div>

      {parsed ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatTimeLabel(parsed)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
