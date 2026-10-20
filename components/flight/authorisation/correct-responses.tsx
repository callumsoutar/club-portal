"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/flight/ui/dialog";
import { Textarea } from "@/components/flight/ui/textarea";
import { FieldRenderer } from "@/components/flight/wizard/field-renderer";
import { correctSubmittedResponses } from "@/lib/flight/actions/correct-responses";
import {
  buildDefaultValues,
  isFieldRequired,
  isPresentational,
  visibleFields,
  type DataSources,
} from "@/lib/flight/form-engine";
import type { AnswerMap, FormTemplate } from "@/lib/flight/types";

interface CorrectResponsesProps {
  authorisationId: string;
  template: FormTemplate;
  answers: AnswerMap;
  sources: DataSources;
}

export function CorrectResponses({
  authorisationId,
  template,
  answers,
  sources,
}: CorrectResponsesProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const form = useForm<AnswerMap>({
    defaultValues: initialValues(template, answers),
  });
  const watched = form.watch();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(initialValues(template, answers));
      setReason("");
    }
  }

  async function save() {
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      toast.error("Give a reason of at least 8 characters.");
      return;
    }

    setPending(true);
    const result = await correctSubmittedResponses({
      authorisationId,
      answers: form.getValues(),
      reason: trimmed,
    });
    setPending(false);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          if (key === "reason") continue;
          form.setError(key, { message });
        }
      }
      toast.error(result.error ?? "Couldn't save that correction.");
      return;
    }

    const changed = result.data?.changed ?? 0;
    toast.success(
      changed === 1 ? "Corrected 1 response" : `Corrected ${changed} responses`,
    );
    setOpen(false);
    router.refresh();
  }

  const sections = template.sections
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => onOpenChange(true)}
      >
        <Pencil className="size-3.5" aria-hidden />
        Correct
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(85vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="px-4 pt-4 pr-12">
            <DialogTitle>Correct submitted responses</DialogTitle>
            <DialogDescription>
              Change any answer on this locked record. The signature stays as
              the pilot signed it, and the previous values are kept in the
              audit log with your name and reason.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
            {sections.map((section) => {
              const fields = visibleFields(section, watched).filter(
                (field) => !isPresentational(field) && field.type !== "signature",
              );
              if (fields.length === 0) return null;
              return (
                <section key={section.key} className="space-y-3">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  {fields.map((field) => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      control={form.control}
                      errors={form.formState.errors}
                      sources={sources}
                      required={isFieldRequired(field, watched)}
                    />
                  ))}
                </section>
              );
            })}

            <div className="space-y-2">
              <label htmlFor="correction-reason" className="text-sm font-semibold">
                Reason for the correction
              </label>
              <Textarea
                id="correction-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="What was wrong, and how you confirmed the new answer."
                maxLength={1000}
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                Required. This is stored with the before and after values.
              </p>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending || reason.trim().length < 8}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function initialValues(template: FormTemplate, answers: AnswerMap): AnswerMap {
  const defaults = buildDefaultValues(template);
  const values: AnswerMap = { ...defaults };

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (isPresentational(field) || field.type === "signature") continue;
      if (!(field.key in answers)) continue;
      const value = answers[field.key];
      if (field.type === "checkbox") {
        values[field.key] = Boolean(value);
      } else if (field.type === "toggle") {
        values[field.key] = value === true || value === false ? value : null;
      } else if (field.type === "number") {
        values[field.key] = value === null || value === undefined ? "" : value;
      } else if (value === null || value === undefined) {
        values[field.key] = "";
      } else {
        values[field.key] = value;
      }
    }
  }

  return values;
}
