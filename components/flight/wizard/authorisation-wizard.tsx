"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Cloud,
  FileText,
  Loader2,
  PenLine,
  Plane,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import { Logo } from "@/components/flight/logo";
import { FieldRenderer } from "@/components/flight/wizard/field-renderer";
import { ProgressRail } from "@/components/flight/wizard/progress-rail";
import { ReviewStep } from "@/components/flight/wizard/review-step";
import { useAutosaveDraft } from "@/hooks/use-autosave-draft";
import { submitAuthorisation } from "@/lib/flight/actions/authorisations";
import { APP_NAME } from "@/lib/flight/constants";
import {
  buildDefaultValues,
  buildSectionSchema,
  isFieldRequired,
  isPresentational,
  visibleFields,
  type DataSources,
} from "@/lib/flight/form-engine";
import { cn } from "@/lib/flight/utils";
import type { AnswerMap, FormField, FormTemplate } from "@/lib/flight/types";

/** Section icons, keyed by the `icon` string stored on form_sections. */
const SECTION_ICONS: Record<string, typeof Plane> = {
  user: UserRound,
  plane: Plane,
  "clipboard-check": ClipboardCheck,
  "shield-check": ShieldCheck,
  "pen-line": PenLine,
};

interface WizardProps {
  template: FormTemplate;
  sources: DataSources;
  /** Known values for a signed-in member — this is the 30-second path. */
  prefill?: AnswerMap;
  cancelHref: string;
  /** Public club logo URL from Settings. */
  clubLogoUrl?: string | null;
}

export function AuthorisationWizard({
  template,
  sources,
  prefill,
  cancelHref,
  clubLogoUrl,
}: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { saveState, restored, checked, save, clear, dismissRestore } =
    useAutosaveDraft(template.id);

  const defaults = useMemo(
    () => ({ ...buildDefaultValues(template), ...prefill }),
    [template, prefill],
  );

  const steps = useMemo(
    () => [
      ...template.sections.map((s) => ({ key: s.key, title: s.title })),
      { key: "__review", title: "Review" },
    ],
    [template],
  );

  const isReview = step === template.sections.length;
  const section = template.sections[step];
  const currentTitle = steps[step]?.title ?? "Authorisation";

  const form = useForm<AnswerMap>({
    defaultValues: defaults,
    mode: "onTouched",
    // The resolver is rebuilt per step so "Continue" only validates what is on
    // screen — a pilot on step two should never be told about step five.
    resolver: async (values, context, options) => {
      if (isReview || !section) return { values, errors: {} };
      const schema = buildSectionSchema(section, values);
      return zodResolver(schema)(values, context, options);
    },
  });

  const { control, formState, getValues, trigger, reset, setError, clearErrors } = form;
  const answers = form.watch();

  // When licence becomes Student Pilot, BFR is no longer compulsory — drop any
  // leftover required error so the Optional label and Continue aren't blocked.
  useEffect(() => {
    if (answers.licence_type === "student" && formState.errors.bfr_expiry) {
      clearErrors("bfr_expiry");
    }
  }, [answers.licence_type, formState.errors.bfr_expiry, clearErrors]);

  // Lock the document so rubber-band scrolling can't pull the shell around.
  // Only the middle pane scrolls — header and footer stay pinned.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  // Autosave on every change, debounced inside the hook. Gated on isDirty so
  // merely opening the wizard never creates a "draft" — otherwise every pilot
  // would be greeted by a resume banner for an empty form.
  useEffect(() => {
    if (!checked || !formState.isDirty) return;
    save(answers, step);
    // `answers` is a fresh object each render; stringify keeps this stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(answers), step, checked]);

  const scrollToTop = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > step ? 1 : -1);
      setStep(next);
      scrollToTop();
    },
    [scrollToTop, step],
  );

  async function handleContinue() {
    const valid = await trigger();
    if (!valid) {
      const firstError = Object.keys(formState.errors)[0];
      if (firstError) {
        document
          .getElementById(firstError)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setCompleted((prev) => new Set(prev).add(step));
    goTo(step + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);

    const result = await submitAuthorisation(getValues(), template.id);

    if (!result.ok) {
      setSubmitting(false);

      if (result.fieldErrors) {
        // Server validation disagreed with the client — surface it on the
        // field and take the pilot back to the step that owns it.
        let jumpTo: number | null = null;
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          setError(key, { message });
          const owningStep = template.sections.findIndex((s) =>
            s.fields.some((f) => f.key === key),
          );
          if (owningStep >= 0 && jumpTo === null) jumpTo = owningStep;
        }
        if (jumpTo !== null) goTo(jumpTo);
      }

      toast.error(result.error ?? "Something went wrong.");
      return;
    }

    clear();
    toast.success("Authorisation submitted");
    router.push(
      `/authorise/submitted?ref=${result.data!.reference}&token=${result.data!.token}`,
    );
  }

  function restoreDraft() {
    if (!restored) return;
    reset({ ...defaults, ...restored.answers });
    setStep(Math.min(restored.step, steps.length - 1));
    setCompleted(new Set(Array.from({ length: restored.step }, (_, i) => i)));
    dismissRestore();
    toast.success("Draft restored");
    scrollToTop();
  }

  function discardDraft() {
    clear();
    dismissRestore();
  }

  const fields = section ? visibleFields(section, answers) : [];

  // Live confirmation counter for checklist-style sections — pilots get a
  // small dopamine ledger as the ticks accumulate.
  const booleanFields = fields.filter(
    (f) => f.type === "checkbox" || f.type === "toggle",
  );
  const confirmedCount = booleanFields.filter((f) =>
    Boolean(answers[f.key]),
  ).length;
  const isChecklistSection = booleanFields.length >= 3;

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-muted/50">
      {/* Top chrome — stays put while fields scroll underneath. */}
      <header className="pt-safe shrink-0 border-b bg-card">
        <div className="mx-auto flex h-12 w-full max-w-2xl items-center justify-between gap-3 px-4 sm:h-14 sm:px-6">
          <span className="flex min-w-0 shrink items-center">
            {clubLogoUrl ? (
              <Logo
                clubLogoUrl={clubLogoUrl}
                className="[&_img]:h-7 sm:[&_img]:h-8"
              />
            ) : (
              <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
                {APP_NAME}
              </span>
            )}
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">
            Flight authorisation
          </span>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-xl"
          >
            <Link href={cancelHref} aria-label="Cancel">
              <X className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-3 sm:px-6">
          <ProgressRail
            steps={steps}
            current={step}
            completed={completed}
            onStepSelect={goTo}
            currentTitle={currentTitle}
          />
        </div>
      </header>

      {/* Only this pane scrolls — keeps the shell locked on mobile. */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain"
      >
        <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-6 sm:px-6 sm:pt-7">
          <AnimatePresence>
            {restored && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex flex-col gap-3 rounded-2xl border border-info/25 bg-info-muted p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <RotateCcw className="mt-0.5 size-4 shrink-0 text-info" />
                    <p className="text-sm leading-snug">
                      You have an unfinished authorisation from earlier.
                    </p>
                  </div>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={discardDraft}
                      className="flex-1 sm:flex-none"
                    >
                      Start fresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={restoreDraft}
                      className="flex-1 sm:flex-none"
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, y: direction > 0 ? 16 : -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -12 : 12 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              {isReview ? (
                <>
                  <StepHeader
                    icon={Sparkles}
                    title="Check before you send"
                    description="Once submitted, your answers and signature are locked and sent to your instructor."
                  />

                  <ReviewStep
                    template={template}
                    answers={answers}
                    sources={sources}
                    onEditSection={goTo}
                  />
                </>
              ) : (
                section && (
                  <>
                    <StepHeader
                      icon={SECTION_ICONS[section.icon ?? ""] ?? FileText}
                      title={section.title}
                      description={section.description}
                      badge={
                        isChecklistSection ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
                              confirmedCount === booleanFields.length
                                ? "bg-foreground text-background"
                                : "bg-card text-foreground ring-1 ring-border",
                            )}
                          >
                            {confirmedCount}/{booleanFields.length}
                          </span>
                        ) : undefined
                      }
                    />

                    {isChecklistSection && (
                      <div className="mb-4 space-y-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-border/80">
                          <motion.div
                            className="h-full rounded-full bg-foreground"
                            initial={false}
                            animate={{
                              width: `${(confirmedCount / Math.max(booleanFields.length, 1)) * 100}%`,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 200,
                              damping: 28,
                            }}
                          />
                        </div>
                        {confirmedCount < booleanFields.length && (
                          <p className="text-xs text-muted-foreground">
                            Tap each item to confirm ·{" "}
                            {booleanFields.length - confirmedCount} remaining
                          </p>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        isChecklistSection
                          ? undefined
                          : "rounded-2xl border bg-card p-4 shadow-xs sm:p-6",
                      )}
                    >
                      <motion.div
                        className={cn(
                          isChecklistSection ? "space-y-2.5" : "space-y-5",
                        )}
                        initial="hidden"
                        animate="show"
                        variants={{
                          show: { transition: { staggerChildren: 0.03 } },
                        }}
                      >
                        {groupFields(fields).map((group) => (
                          <motion.div
                            key={group.map((f) => f.id).join("-")}
                            variants={{
                              hidden: { opacity: 0, y: 8 },
                              show: {
                                opacity: 1,
                                y: 0,
                                transition: {
                                  duration: 0.2,
                                  ease: [0.32, 0.72, 0, 1],
                                },
                              },
                            }}
                            className={cn(
                              group.length > 1 && "grid gap-4 sm:grid-cols-2",
                            )}
                          >
                            {group.map((field) => (
                              <FieldRenderer
                                key={field.id}
                                field={field}
                                control={control}
                                errors={formState.errors}
                                sources={sources}
                                required={isFieldRequired(field, answers)}
                              />
                            ))}
                          </motion.div>
                        ))}

                        {fields.filter((f) => !isPresentational(f)).length ===
                          0 && (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            Nothing to complete in this section.
                          </p>
                        )}
                      </motion.div>
                    </div>
                  </>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Thumb-zone actions — part of the locked shell, not a floating overlay. */}
      <footer className="w-full max-w-none shrink-0 border-t bg-card px-0 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.18)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-3 sm:px-6">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => goTo(step - 1)}
              disabled={submitting}
              className="size-14 shrink-0 rounded-2xl p-0 sm:h-14 sm:w-auto sm:gap-1.5 sm:px-5"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}

          {isReview ? (
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={handleContinue}
              className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold"
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>

        <SaveIndicator state={saveState} className="mx-auto max-w-2xl px-4 pb-2 sm:px-6" />
      </footer>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Plane;
  title: string;
  description?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start gap-3 sm:mb-5 sm:gap-3.5">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-card shadow-xs">
        <Icon className="size-4 text-foreground" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[1.35rem] leading-tight font-semibold tracking-tight text-balance sm:text-xl">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}

function SaveIndicator({
  state,
  className,
}: {
  state: "idle" | "saving" | "saved";
  className?: string;
}) {
  return (
    <div className={cn("flex h-5 items-center justify-center gap-1.5", className)}>
      <AnimatePresence mode="wait">
        {state !== "idle" && (
          <motion.span
            key={state}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            {state === "saving" ? (
              <>
                <Cloud className="size-3" />
                Saving…
              </>
            ) : (
              <>
                <Check className="size-3 text-success" />
                Progress saved
              </>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pair fuel + oil into one row so they sit beside each other after aircraft. */
function groupFields(fields: FormField[]): FormField[][] {
  const groups: FormField[][] = [];
  let i = 0;

  while (i < fields.length) {
    const current = fields[i]!;
    const next = fields[i + 1];

    if (current.key === "fuel_level" && next?.key === "oil_level") {
      groups.push([current, next]);
      i += 2;
      continue;
    }

    groups.push([current]);
    i += 1;
  }

  return groups;
}
