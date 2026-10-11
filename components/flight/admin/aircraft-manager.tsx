"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Plane, Plus } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { deleteAircraft, upsertAircraft } from "@/lib/flight/actions/admin";
import { cn } from "@/lib/flight/utils";
import type { Aircraft } from "@/lib/flight/types";

const PALETTE = ["#0F62FE", "#12B76A", "#F79009", "#7A5AF8", "#F04438", "#06AED4"];

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "retired", label: "Retired" },
] as const;

type Values = {
  registration: string;
  aircraft_type: string;
  display_name: string;
  status: Aircraft["status"];
  colour: string;
  is_active: boolean;
  notes: string;
};

function toFormValues(item: Aircraft, overrides: Partial<Values> = {}) {
  return {
    id: item.id,
    registration: item.registration,
    aircraft_type: item.aircraft_type,
    display_name: item.display_name ?? "",
    status: item.status,
    colour: item.colour,
    is_active: item.is_active,
    notes: item.notes ?? "",
    ...overrides,
  };
}

export function AircraftManager({ aircraft }: { aircraft: Aircraft[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Aircraft | null>(null);
  const [open, setOpen] = useState(false);

  const activeCount = aircraft.filter((a) => a.is_active).length;

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: Aircraft) {
    setEditing(item);
    setOpen(true);
  }

  async function remove(item: Aircraft) {
    const result = await deleteAircraft(item.id);

    if (result.ok && result.error) toast.info(result.error);
    else if (!result.ok) toast.error(result.error ?? "Couldn't delete.");
    else toast.success(`${item.registration} removed`);

    router.refresh();
  }

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
            Fleet
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Only active aircraft appear in the pilot dropdown.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {aircraft.length > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{activeCount}</span>{" "}
              active
              <span className="mx-2 text-border">·</span>
              {aircraft.length} total
            </p>
          )}
          <Button size="sm" onClick={openNew} className="h-9 gap-1.5 px-3">
            <Plus className="size-4" />
            Add aircraft
          </Button>
        </div>
      </header>

      {aircraft.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-b border-foreground/10 py-16 text-center">
          <Plane className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No aircraft yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your first aircraft and it will show up in the authorisation
            form immediately.
          </p>
          <Button size="sm" onClick={openNew} className="mt-2 gap-1.5">
            <Plus className="size-4" />
            Add aircraft
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Registration
                </TableHead>
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Type
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 sm:table-cell">
                  Status
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 md:table-cell">
                  In form
                </TableHead>
                <TableHead className="h-11 w-24 px-4 text-right text-[13px] font-semibold text-foreground/80">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "border-b border-border/70 last:border-0 hover:bg-muted/30",
                    !item.is_active && "bg-muted/20",
                  )}
                >
                  <TableCell className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">
                        {item.registration}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                        {item.aircraft_type}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 text-sm text-foreground/80 sm:table-cell">
                    {item.aircraft_type}
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 sm:table-cell">
                    <StatusPill status={item.status} />
                  </TableCell>

                  <TableCell className="hidden px-4 py-4 md:table-cell">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
                        item.is_active
                          ? "bg-success-muted text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.is_active ? "Shown" : "Hidden"}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-4 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AircraftDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDelete={editing ? () => remove(editing) : undefined}
      />
    </>
  );
}

function StatusPill({ status }: { status: Aircraft["status"] }) {
  const styles: Record<Aircraft["status"], string> = {
    available: "bg-success-muted text-success",
    maintenance: "bg-warning-muted text-warning-foreground",
    reserved: "bg-info-muted text-info",
    retired: "bg-muted text-muted-foreground",
  };

  const labels: Record<Aircraft["status"], string> = {
    available: "Available",
    maintenance: "Maintenance",
    reserved: "Reserved",
    retired: "Retired",
  };

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function AircraftDialog({
  open,
  onOpenChange,
  editing,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Aircraft | null;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<Values>({
    defaultValues: {
      registration: editing?.registration ?? "",
      aircraft_type: editing?.aircraft_type ?? "",
      display_name: editing?.display_name ?? "",
      status: editing?.status ?? "available",
      colour: editing?.colour ?? PALETTE[0]!,
      is_active: editing?.is_active ?? true,
      notes: editing?.notes ?? "",
    },
  });

  async function onSubmit(values: Values) {
    setPending(true);
    const result = await upsertAircraft({ ...values, id: editing?.id });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't save.");
      return;
    }

    toast.success(editing ? "Aircraft updated" : "Aircraft added");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit aircraft" : "Add aircraft"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration</Label>
              <Input
                id="registration"
                placeholder="ZK-ABC"
                className="uppercase"
                {...register("registration", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aircraft_type">Type</Label>
              <Input
                id="aircraft_type"
                placeholder="Cessna 172S"
                {...register("aircraft_type", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              placeholder="Cessna 172 · ZK-ABC"
              {...register("display_name")}
            />
            <p className="text-xs text-muted-foreground">
              How pilots see it in the dropdown. Leave blank to build it
              automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(v: string) =>
                setValue("status", v as Aircraft["status"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {PALETTE.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setValue("colour", colour)}
                  aria-label={`Select colour ${colour}`}
                  className={cn(
                    "size-7 rounded-md transition-shadow",
                    watch("colour") === colour &&
                      "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: colour }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm font-medium">Show in pilot form</span>
            <Switch
              checked={watch("is_active")}
              onCheckedChange={(v: boolean) => setValue("is_active", v)}
            />
          </label>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-danger-muted hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add aircraft"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
