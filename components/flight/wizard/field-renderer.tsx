"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/flight/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import { Textarea } from "@/components/flight/ui/textarea";
import { SignaturePad } from "@/components/flight/signature-pad";
import { DatePicker, datePickerModeForKey } from "@/components/flight/date-picker";
import { ChecklistItem } from "@/components/flight/wizard/checklist-item";
import { TimeInput } from "@/components/flight/wizard/time-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveOptions, type DataSources } from "@/lib/flight/form-engine";
import { cn } from "@/lib/flight/utils";
import type { AnswerMap, FieldOption, FormField } from "@/lib/flight/types";

interface FieldRendererProps {
  field: FormField;
  control: Control<AnswerMap>;
  errors: FieldErrors<AnswerMap>;
  sources: DataSources;
  /** Resolved required state (may depend on other answers). */
  required?: boolean;
}

/**
 * Renders one database-defined field.
 *
 * Everything the pilot sees comes through here, so the form builder can add a
 * field type without any other file changing.
 */
export function FieldRenderer({
  field,
  control,
  errors,
  sources,
  required = field.is_required,
}: FieldRendererProps) {
  const error = errors[field.key]?.message as string | undefined;
  const isMobile = useIsMobile();

  // Presentational blocks carry no value and skip the label/error scaffolding.
  if (field.type === "heading") {
    return (
      <h3 className="pt-2 text-base font-semibold tracking-tight">{field.label}</h3>
    );
  }

  if (field.type === "info") {
    return (
      <div className="rounded-xl border border-info/20 bg-info-muted p-4">
        <p className="text-sm leading-relaxed text-foreground/80">{field.label}</p>
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">{field.label}</p>
    );
  }

  if (field.type === "checkbox") {
    return (
      <Controller
        name={field.key}
        control={control}
        render={({ field: rhf }) => (
          <div>
            <ChecklistItem
              id={field.key}
              label={field.label}
              helpText={field.help_text}
              checked={Boolean(rhf.value)}
              onCheckedChange={rhf.onChange}
              error={Boolean(error)}
              optional={!required}
            />
            <FieldError message={error} />
          </div>
        )}
      />
    );
  }

  if (field.type === "toggle") {
    return (
      <Controller
        name={field.key}
        control={control}
        render={({ field: rhf }) => {
          const checked = rhf.value === true || rhf.value === false
            ? Boolean(rhf.value)
            : null;

          return (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {field.label}
                  {required && <span className="ml-1 text-destructive">*</span>}
                </p>
                {field.help_text && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {field.help_text}
                  </p>
                )}
              </div>

              <div
                role="radiogroup"
                aria-label={field.label}
                aria-invalid={Boolean(error) || undefined}
                className="grid grid-cols-2 gap-2"
              >
                {(
                  [
                    { value: true, label: "Yes" },
                    { value: false, label: "No" },
                  ] as const
                ).map((option) => {
                  const selected = checked === option.value;
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        rhf.onChange(option.value);
                        if (typeof navigator !== "undefined") {
                          navigator.vibrate?.(10);
                        }
                      }}
                      className={cn(
                        "flex h-14 items-center justify-center rounded-2xl border text-[15px] font-semibold transition-all duration-200 select-none active:scale-[0.985] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none sm:h-12",
                        selected
                          ? "border-foreground bg-foreground text-background shadow-xs"
                          : "border-border bg-card text-foreground hover:border-foreground/25",
                        error && !selected && "border-destructive/50 bg-danger-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <FieldError message={error} />
            </div>
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={field.key} className="text-sm font-semibold text-foreground">
          {field.label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {!required && (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </div>

      <Controller
        name={field.key}
        control={control}
        render={({ field: rhf }) => {
          const value = (rhf.value ?? "") as string;
          const invalid = Boolean(error);

          switch (field.type) {
            case "textarea":
              return (
                <Textarea
                  id={field.key}
                  value={value}
                  onChange={rhf.onChange}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder ?? undefined}
                  aria-invalid={invalid}
                  rows={3}
                  className="min-h-28 resize-none rounded-2xl border-border bg-background text-base shadow-xs focus-visible:bg-background sm:min-h-24 sm:text-sm"
                />
              );

            case "time":
              return (
                <TimeInput
                  id={field.key}
                  value={value}
                  onChange={rhf.onChange}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder ?? "e.g. 1415 or 2:15pm"}
                  invalid={invalid}
                />
              );

            case "date":
              return (
                <DatePicker
                  id={field.key}
                  value={value}
                  onChange={rhf.onChange}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder ?? `Choose ${field.label.toLowerCase()}`}
                  invalid={invalid}
                  mode={datePickerModeForKey(field.key)}
                  clearable={!required}
                  label={field.label}
                />
              );

            case "select": {
              const options = resolveOptions(field, sources);
              const placeholder =
                field.placeholder ?? `Choose ${field.label.toLowerCase()}`;

              // Native picker on mobile — opens the OS sheet and avoids the
              // custom Radix overlay, which feels awkward on phones.
              if (isMobile) {
                return (
                  <NativeSelect
                    id={field.key}
                    value={value}
                    invalid={invalid}
                    placeholder={placeholder}
                    options={options}
                    onChange={rhf.onChange}
                    onBlur={rhf.onBlur}
                  />
                );
              }

              // Keep Select controlled for its whole lifetime. Empty string means
              // "nothing chosen" and shows the placeholder — never pass
              // `undefined`, or React warns about uncontrolled → controlled.
              return (
                <Select value={value} onValueChange={rhf.onChange}>
                  <SelectTrigger
                    id={field.key}
                    aria-invalid={invalid}
                    className="h-14 w-full rounded-2xl border-border bg-background text-base shadow-xs sm:h-12 sm:rounded-xl sm:text-sm"
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="w-[var(--radix-select-trigger-width)]"
                  >
                    {options.length === 0 && (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        Nothing available right now
                      </div>
                    )}
                    {options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.description ? (
                          <span className="flex flex-col items-start gap-0.5">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                        ) : (
                          option.label
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }

            case "radio": {
              const options = resolveOptions(field, sources);
              return (
                <RadioGroup value={value} onValueChange={rhf.onChange} className="gap-2">
                  {options.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all duration-200 select-none active:scale-[0.985]",
                        value === option.value
                          ? "border-foreground/25 bg-muted/50"
                          : "border-border bg-background hover:border-foreground/20",
                      )}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`${field.key}-${option.value}`}
                      />
                      <span className="text-[15px] font-medium">{option.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              );
            }

            case "signature":
              return <SignaturePad value={value} onChange={rhf.onChange} />;

            default: {
              const numericKeyboard =
                field.type === "number" || usesNumericKeyboard(field.key);

              return (
                <Input
                  id={field.key}
                  type={field.type === "number" ? "number" : "text"}
                  value={value}
                  onChange={rhf.onChange}
                  onBlur={rhf.onBlur}
                  placeholder={field.placeholder ?? undefined}
                  aria-invalid={invalid}
                  className="h-14 rounded-2xl border-border bg-background text-base shadow-xs focus-visible:bg-background sm:h-12 sm:rounded-xl sm:text-sm"
                  inputMode={numericKeyboard ? "decimal" : undefined}
                  autoComplete={autoCompleteFor(field.key)}
                  autoCorrect={numericKeyboard ? "off" : undefined}
                  spellCheck={numericKeyboard ? false : undefined}
                />
              );
            }
          }
        }}
      />

      {field.help_text && !error && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {field.help_text}
        </p>
      )}

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          className="flex items-center gap-1.5 pt-1 text-xs font-medium text-destructive"
          role="alert"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** OS-native `<select>` — used on phones so the system picker opens. */
function NativeSelect({
  id,
  value,
  invalid,
  placeholder,
  options,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  invalid: boolean;
  placeholder: string;
  options: FieldOption[];
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-14 w-full appearance-none rounded-2xl border border-border bg-background bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat px-4 pr-10 text-base shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        !value && "text-muted-foreground",
        invalid && "border-destructive/50",
      )}
    >
      <option value="" disabled={false}>
        {placeholder}
      </option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.description
            ? `${option.label} — ${option.description}`
            : option.label}
        </option>
      ))}
    </select>
  );
}

/** Let the browser fill what it already knows — every second counts here. */
function autoCompleteFor(key: string): string | undefined {
  if (key.includes("phone")) return "tel";
  if (key.includes("email")) return "email";
  if (key.includes("name") && !key.includes("passenger")) return "name";
  return undefined;
}

/** Fuel / oil stay free-text (e.g. "Full") but open the numeric keypad on mobile. */
function usesNumericKeyboard(key: string): boolean {
  return key === "fuel_level" || key === "oil_level";
}
