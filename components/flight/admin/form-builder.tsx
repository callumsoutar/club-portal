"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  Asterisk,
  Database,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/flight/ui/dialog";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import { Switch } from "@/components/flight/ui/switch";
import { Textarea } from "@/components/flight/ui/textarea";
import {
  deleteField,
  reorderFields,
  setTemplateVisibility,
  updateTemplateMeta,
  upsertField,
} from "@/lib/flight/actions/admin";
import { cn } from "@/lib/flight/utils";
import type { FieldType, FormField, FormSection, FormTemplate } from "@/lib/flight/types";

const FIELD_TYPES: { value: FieldType; label: string; group: string }[] = [
  { value: "text", label: "Short text", group: "Input" },
  { value: "textarea", label: "Long text", group: "Input" },
  { value: "number", label: "Number", group: "Input" },
  { value: "date", label: "Date", group: "Input" },
  { value: "time", label: "Time", group: "Input" },
  { value: "select", label: "Dropdown", group: "Choice" },
  { value: "radio", label: "Radio buttons", group: "Choice" },
  { value: "checkbox", label: "Checkbox", group: "Choice" },
  { value: "toggle", label: "Toggle", group: "Choice" },
  { value: "signature", label: "Signature", group: "Special" },
  { value: "file", label: "File upload", group: "Special" },
  { value: "heading", label: "Section heading", group: "Content" },
  { value: "info", label: "Information block", group: "Content" },
  { value: "paragraph", label: "Paragraph", group: "Content" },
];

const DATA_SOURCES = [
  { value: "__none", label: "Static options" },
  { value: "aircraft", label: "Live: active aircraft" },
  { value: "instructors", label: "Live: active instructors" },
];

const TYPE_LABEL = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));

export function FormBuilder({ template }: { template: FormTemplate }) {
  const router = useRouter();
  const [pendingVisibility, setPendingVisibility] = useState(false);

  async function updateVisibility(visibility: "published" | "draft") {
    setPendingVisibility(true);
    const result = await setTemplateVisibility(template.id, visibility);
    setPendingVisibility(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't update visibility.");
      return;
    }

    toast.success(
      visibility === "published"
        ? "Form published — pilots can choose it"
        : "Form moved to draft",
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <TemplateNameEditor
              templateId={template.id}
              name={template.name}
              description={template.description}
            />
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
                template.is_active
                  ? "bg-success-muted text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {template.is_active ? "Published" : "Draft"}
            </span>
          </div>
          <TemplateDescriptionEditor
            templateId={template.id}
            name={template.name}
            description={template.description}
          />
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            v{template.version}
            {template.is_active
              ? " · Live for new authorisations"
              : " · Not shown to pilots yet"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {template.is_active ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3"
              disabled={pendingVisibility}
              onClick={() => updateVisibility("draft")}
            >
              {pendingVisibility ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              Move to draft
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-9 px-3"
              disabled={pendingVisibility}
              onClick={() => updateVisibility("published")}
            >
              {pendingVisibility ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              Publish form
            </Button>
          )}
        </div>
      </header>

      <div
        className={cn(
          "rounded-xl border p-4",
          template.is_active
            ? "border-info/20 bg-info-muted"
            : "border-border bg-muted/40",
        )}
      >
        <p className="text-sm leading-relaxed">
          {template.is_active
            ? "This form is published and available for pilots to complete. Field changes apply to new authorisations immediately. Past submissions keep the version they were completed on. You can publish several forms at once — pilots will choose which one to fill in."
            : "This form is a draft. Pilots won't see it until you publish. You can have multiple published forms available at the same time."}
        </p>
      </div>

      <div className="space-y-5">
        {template.sections.map((section) => (
          <SectionEditor key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function TemplateNameEditor({
  templateId,
  name,
  description,
}: {
  templateId: string;
  name: string;
  description: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);

  async function save() {
    const next = value.trim();
    if (!next || next === name) {
      setValue(name);
      setEditing(false);
      return;
    }

    setPending(true);
    const result = await updateTemplateMeta({
      id: templateId,
      name: next,
      description: description ?? "",
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't rename form.");
      setValue(name);
      setEditing(false);
      return;
    }

    toast.success("Form renamed");
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          autoFocus
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              setValue(name);
              setEditing(false);
            }
          }}
          className="h-11 max-w-xl text-[1.25rem] font-semibold tracking-[-0.03em]"
          aria-label="Form name"
        />
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className="group inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      title="Click to rename"
    >
      <h1 className="truncate text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
        {name}
      </h1>
      <Pencil className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
    </button>
  );
}

/** Short blurb shown under the form name on the pilot form picker. */
function TemplateDescriptionEditor({
  templateId,
  name,
  description,
}: {
  templateId: string;
  name: string;
  description: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");
  const [pending, setPending] = useState(false);

  async function save() {
    const next = value.trim();
    if (next === (description ?? "").trim()) {
      setValue(description ?? "");
      setEditing(false);
      return;
    }

    setPending(true);
    const result = await updateTemplateMeta({
      id: templateId,
      name,
      description: next,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't update description.");
      setValue(description ?? "");
      setEditing(false);
      return;
    }

    toast.success("Picker description updated");
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-3 max-w-xl space-y-2">
        <Label htmlFor="template-description" className="text-xs text-muted-foreground">
          Shown on the form picker for pilots
        </Label>
        <Textarea
          id="template-description"
          autoFocus
          value={value}
          disabled={pending}
          rows={3}
          maxLength={500}
          placeholder="e.g. Use this for local solo flights in the circuit."
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(description ?? "");
              setEditing(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          className="resize-none text-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={pending}
            onClick={() => void save()}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={pending}
            onClick={() => {
              setValue(description ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(description ?? "");
        setEditing(true);
      }}
      className="group mt-3 flex max-w-xl items-start gap-2 rounded-lg text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      title="Click to edit picker description"
    >
      <p
        className={cn(
          "text-sm leading-relaxed",
          description ? "text-muted-foreground" : "text-muted-foreground/70 italic",
        )}
      >
        {description?.trim() ||
          "Add a short description for the form picker…"}
      </p>
      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
    </button>
  );
}

function SectionEditor({ section }: { section: FormSection }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormField | null>(null);
  const [open, setOpen] = useState(false);

  const fields = [...section.fields].sort((a, b) => a.sort_order - b.sort_order);

  /**
   * Move a field one place up or down.
   *
   * Deliberately buttons rather than drag-and-drop: this is an occasional
   * admin task, and arrow buttons are keyboard accessible, work on touch, and
   * need no library. Drag can come later without changing the action.
   */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;

    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];

    await reorderFields(section.id, reordered.map((f) => f.id));
    router.refresh();
  }

  async function remove(field: FormField) {
    const result = await deleteField(field.id);
    if (!result.ok) {
      toast.error(result.error ?? "Couldn't delete.");
      return;
    }
    toast.success(`"${field.label}" removed`);
    router.refresh();
  }

  return (
    <section className="surface-premium overflow-hidden rounded-2xl border">
      <header className="flex items-start justify-between gap-4 border-b bg-muted/30 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{section.title}</h2>
          {section.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="-my-1 h-8 shrink-0 gap-1.5 text-xs"
        >
          <Plus className="size-3.5" />
          Add field
        </Button>
      </header>

      {fields.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No fields in this section yet.
        </p>
      ) : (
        <ul className="divide-y">
          {fields.map((field, index) => (
            <li key={field.id} className="group flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${field.label} up`}
                  className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-25"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === fields.length - 1}
                  aria-label={`Move ${field.label} down`}
                  className="text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-25"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              <GripVertical className="size-4 shrink-0 text-muted-foreground/25" aria-hidden />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{field.label}</span>
                  {field.is_required && (
                    <Asterisk className="size-3 shrink-0 text-destructive/60" aria-label="Required" />
                  )}
                  {field.data_source && (
                    <Database
                      className="size-3 shrink-0 text-info"
                      aria-label="Options come from live data"
                    />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {TYPE_LABEL[field.type] ?? field.type} ·{" "}
                  <span className="font-mono">{field.key}</span>
                </p>
              </div>

              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg"
                  onClick={() => {
                    setEditing(field);
                    setOpen(true);
                  }}
                  aria-label={`Edit ${field.label}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => remove(field)}
                  aria-label={`Delete ${field.label}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FieldDialog
        key={editing?.id ?? `new-${section.id}`}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        sectionId={section.id}
        nextSortOrder={fields.length + 1}
      />
    </section>
  );
}

type FieldValues = {
  key: string;
  label: string;
  type: FieldType;
  placeholder: string;
  help_text: string;
  is_required: boolean;
  data_source: string;
  options_raw: string;
  must_be_true: boolean;
};

function FieldDialog({
  open,
  onOpenChange,
  editing,
  sectionId,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FormField | null;
  sectionId: string;
  nextSortOrder: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<FieldValues>({
    defaultValues: {
      key: editing?.key ?? "",
      label: editing?.label ?? "",
      type: editing?.type ?? "text",
      placeholder: editing?.placeholder ?? "",
      help_text: editing?.help_text ?? "",
      is_required: editing?.is_required ?? false,
      data_source: editing?.data_source ?? "__none",
      // Options are edited as "value|Label" lines — far quicker than a nested
      // repeater UI for what is usually five or six entries.
      options_raw: (editing?.options ?? [])
        .map((o) => `${o.value}|${o.label}`)
        .join("\n"),
      must_be_true: Boolean(editing?.validation?.mustBeTrue),
    },
  });

  const type = watch("type");
  const isChoice = type === "select" || type === "radio";
  const isBoolean = type === "checkbox" || type === "toggle";
  const usesLiveData = watch("data_source") !== "__none";

  async function onSubmit(values: FieldValues) {
    setPending(true);

    const options = values.options_raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, ...rest] = line.split("|");
        const label = rest.join("|").trim() || value!.trim();
        return { value: value!.trim(), label };
      });

    const result = await upsertField({
      id: editing?.id,
      section_id: sectionId,
      key: values.key,
      label: values.label,
      type: values.type,
      placeholder: values.placeholder,
      help_text: values.help_text,
      is_required: values.is_required,
      validation: isBoolean && values.must_be_true ? { mustBeTrue: true } : {},
      options: isChoice && !usesLiveData ? options : [],
      data_source:
        values.data_source === "__none"
          ? null
          : (values.data_source as "aircraft" | "instructors"),
      sort_order: editing?.sort_order ?? nextSortOrder,
    });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't save.");
      return;
    }

    toast.success(editing ? "Field updated" : "Field added");
    onOpenChange(false);
    router.refresh();
  }

  // Auto-derive a key from the label for new fields, so an admin never has to
  // think about snake_case.
  function handleLabelBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (editing || watch("key")) return;

    const slug = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);

    if (slug) setValue("key", /^[a-z]/.test(slug) ? slug : `f_${slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit field" : "Add field"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              className="rounded-xl"
              placeholder="e.g. Fuel & oil checked"
              {...register("label", { required: true, onBlur: handleLabelBlur })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                className="rounded-xl font-mono text-sm"
                placeholder="fuel_oil"
                disabled={Boolean(editing)}
                {...register("key", { required: true })}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Keys can&apos;t change — past answers reference them.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: string) => setValue("type", v as FieldType)}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="help_text">Help text</Label>
            <Textarea
              id="help_text"
              rows={2}
              className="resize-none rounded-xl"
              placeholder="Shown under the field"
              {...register("help_text")}
            />
          </div>

          {!isBoolean && (
            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input id="placeholder" className="rounded-xl" {...register("placeholder")} />
            </div>
          )}

          {isChoice && (
            <>
              <div className="space-y-2">
                <Label>Options come from</Label>
                <Select
                  value={watch("data_source")}
                  onValueChange={(v: string) => setValue("data_source", v)}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {usesLiveData && (
                  <p className="text-xs text-muted-foreground">
                    Options stay in sync with your fleet and staff automatically.
                  </p>
                )}
              </div>

              {!usesLiveData && (
                <div className="space-y-2">
                  <Label htmlFor="options_raw">Options</Label>
                  <Textarea
                    id="options_raw"
                    rows={4}
                    className="resize-none rounded-xl font-mono text-sm"
                    placeholder={"ppl|Private Pilot Licence\ncpl|Commercial Pilot Licence"}
                    {...register("options_raw")}
                  />
                  <p className="text-xs text-muted-foreground">
                    One per line, as <code>value|Label</code>.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-xl border p-3.5">
              <span className="text-sm font-medium">Required</span>
              <Switch
                checked={watch("is_required")}
                onCheckedChange={(v: boolean) => setValue("is_required", v)}
              />
            </label>

            {isBoolean && (
              <label className="flex items-center justify-between gap-3 rounded-xl border p-3.5">
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Must be ticked</span>
                  <span className="block text-xs text-muted-foreground">
                    Use for declarations the pilot has to agree to
                  </span>
                </span>
                <Switch
                  checked={watch("must_be_true")}
                  onCheckedChange={(v: boolean) => setValue("must_be_true", v)}
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
