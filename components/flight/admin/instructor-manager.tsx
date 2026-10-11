"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, MoreHorizontal, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/flight/ui/badge";
import { Button } from "@/components/flight/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/flight/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/flight/ui/dropdown-menu";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import { Switch } from "@/components/flight/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/flight/ui/table";
import { deleteInstructor, upsertInstructor } from "@/lib/flight/actions/admin";
import { cn } from "@/lib/flight/utils";
import type { Instructor } from "@/lib/flight/types";

type Values = {
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  can_approve: boolean;
  can_manage_fleet: boolean;
  can_manage_forms: boolean;
};

export function InstructorManager({
  instructors,
}: {
  instructors: Instructor[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [open, setOpen] = useState(false);

  const activeCount = instructors.filter((i) => i.is_active).length;

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  async function remove(item: Instructor) {
    const result = await deleteInstructor(item.id);

    if (result.ok && result.error) toast.info(result.error);
    else if (!result.ok) toast.error(result.error ?? "Couldn't delete.");
    else toast.success(`${item.full_name} removed`);

    router.refresh();
  }

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem] sm:leading-tight">
            Instructors
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Only active instructors appear in the approval dropdown.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {instructors.length > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{activeCount}</span>{" "}
              active
              <span className="mx-2 text-border">·</span>
              {instructors.length} total
            </p>
          )}
          <Button size="sm" onClick={openNew} className="h-9 gap-1.5 px-3">
            <Plus className="size-4" />
            Add instructor
          </Button>
        </div>
      </header>

      {instructors.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-b border-foreground/10 py-16 text-center">
          <Users className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No instructors yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add instructing staff so pilots can nominate who should authorise
            their flight.
          </p>
          <Button size="sm" onClick={openNew} className="mt-2 gap-1.5">
            <Plus className="size-4" />
            Add instructor
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Name
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 sm:table-cell">
                  Contact
                </TableHead>
                <TableHead className="hidden h-11 px-4 text-[13px] font-semibold text-foreground/80 md:table-cell">
                  Permissions
                </TableHead>
                <TableHead className="h-11 px-4 text-[13px] font-semibold text-foreground/80">
                  Active
                </TableHead>
                <TableHead className="h-11 w-14 px-3 text-right text-[13px] font-semibold text-foreground/80">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.map((item) => {
                const permissions = [
                  item.permissions.can_approve !== false ? "Approve" : null,
                  item.permissions.can_manage_fleet ? "Fleet" : null,
                  item.permissions.can_manage_forms ? "Forms" : null,
                ].filter(Boolean);

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "border-b border-border/70 last:border-0 hover:bg-muted/30",
                      !item.is_active && "bg-muted/20"
                    )}
                  >
                  <TableCell className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                        {item.email ?? "No email"}
                      </p>
                    </div>
                  </TableCell>
                <TableCell className="hidden px-4 py-4 sm:table-cell">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-[13px] text-muted-foreground">
                      {item.email ?? "—"}
                    </p>
                    {item.phone ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.phone}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden px-4 py-4 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {permissions.length > 0 ? (
                      permissions.map((label) => (
                        <span
                          key={label}
                          className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
                      item.is_active
                        ? "bg-success-muted text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                  <TableCell className="px-4 py-4 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                      className="h-8 px-3 text-xs font-medium text-foreground/80 hover:text-foreground"
                    >
                      Edit
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <InstructorDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDelete={editing ? () => remove(editing) : undefined}
      />
    </>
  );
}

function InstructorDialog({
  open,
  onOpenChange,
  editing,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Instructor | null;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<Values>({
    defaultValues: {
      full_name: editing?.full_name ?? "",
      email: editing?.email ?? "",
      phone: editing?.phone ?? "",
      is_active: editing?.is_active ?? true,
      can_approve: editing?.permissions.can_approve ?? true,
      can_manage_fleet: editing?.permissions.can_manage_fleet ?? false,
      can_manage_forms: editing?.permissions.can_manage_forms ?? false,
    },
  });

  async function onSubmit(values: Values) {
    setPending(true);

    const result = await upsertInstructor({
      id: editing?.id,
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      is_active: values.is_active,
      permissions: {
        can_approve: values.can_approve,
        can_manage_fleet: values.can_manage_fleet,
        can_manage_forms: values.can_manage_forms,
      },
    });

    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Couldn't save.");
      return;
    }

    toast.success(editing ? "Instructor updated" : "Instructor added");
    onOpenChange(false);
    router.refresh();
  }

  const permissions: { key: keyof Values; label: string; hint: string }[] = [
    {
      key: "can_approve",
      label: "Can approve flights",
      hint: "Appears in the pilot dropdown",
    },
    {
      key: "can_manage_fleet",
      label: "Can manage the fleet",
      hint: "Add and edit aircraft",
    },
    {
      key: "can_manage_forms",
      label: "Can edit the form",
      hint: "Access the form builder",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit instructor" : "Add instructor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: true })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Notifications about flights they&apos;re authorising go to this
            address.
          </p>

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Permissions</p>
            {permissions.map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <span className="space-y-0.5">
                  <span className="block text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hint}
                  </span>
                </span>
                <Switch
                  checked={Boolean(watch(key))}
                  onCheckedChange={(v: boolean) => setValue(key, v)}
                />
              </label>
            ))}
          </div>

          <label className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm font-medium">Active</span>
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
                {editing ? "Save changes" : "Add instructor"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
