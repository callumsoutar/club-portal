"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { deleteSyllabusItem, moveSyllabusItem, saveSyllabusItem } from "@/lib/ccat/actions";
import type { CcatItem, SignoffMode } from "@/lib/ccat/types";
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

interface Category {
  id: string;
  name: string;
  signoffMode: SignoffMode;
}

export function SyllabusManager({
  categories,
  items,
}: {
  categories: Category[];
  items: CcatItem[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {categories.map((category) => {
        const rows = items
          .filter((item) => item.categoryId === category.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <section key={category.id} className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{category.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {category.signoffMode === "learnt_taught" ? "Learnt and taught are signed off separately." : "One completion sign-off."}
                </p>
              </div>
              <ItemDialog category={category} categories={categories} />
            </div>
            {rows.length === 0 ? (
              <p className="border-b py-6 text-sm text-muted-foreground">No items in this category yet.</p>
            ) : (
              <ol className="divide-y rounded-xl border bg-card">
                {rows.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                    <span className="w-6 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className={item.isActive ? "text-sm font-medium" : "text-sm text-muted-foreground line-through"}>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.signoffMode === "learnt_taught" ? "Learnt and taught" : "Single completion"}
                        {item.isActive ? "" : " · Disabled"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <MoveButton id={item.id} direction="up" disabled={index === 0} />
                      <MoveButton id={item.id} direction="down" disabled={index === rows.length - 1} />
                      <ItemDialog category={category} categories={categories} item={item} />
                      <DeleteButton id={item.id} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MoveButton({ id, direction, disabled }: { id: string; direction: "up" | "down"; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        const result = await moveSyllabusItem(id, direction);
        setPending(false);
        if (!result.ok) toast.error(result.error ?? "Could not reorder.");
        else router.refresh();
      }}
    >
      {direction === "up" ? "Up" : "Down"}
    </Button>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm("Delete this syllabus item? Items that already have training records are disabled instead.")) return;
        setPending(true);
        const result = await deleteSyllabusItem(id);
        setPending(false);
        if (!result.ok) toast.error(result.error ?? "Could not delete.");
        else {
          if (result.error) toast.info(result.error);
          else toast.success("Syllabus item deleted");
          router.refresh();
        }
      }}
    >
      Delete
    </Button>
  );
}

function ItemDialog({
  category,
  categories,
  item,
}: {
  category: Category;
  categories: Category[];
  item?: CcatItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? category.id);
  const [mode, setMode] = useState<SignoffMode>(item?.signoffMode ?? category.signoffMode);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveSyllabusItem({
      id: item?.id,
      categoryId,
      name,
      signoffMode: mode,
      isActive,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save.");
      return;
    }
    toast.success(item ? "Syllabus item updated" : "Syllabus item added");
    setOpen(false);
    if (!item) setName("");
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" variant={item ? "ghost" : "outline"} onClick={() => setOpen(true)} className="gap-1.5">
        {item ? "Edit" : <><Plus className="size-4" />Add</>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item ? "Edit syllabus item" : "Add syllabus item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`item-name-${item?.id ?? category.id}`}>Name</Label>
              <Input id={`item-name-${item?.id ?? category.id}`} value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sign-off</Label>
              <Select value={mode} onValueChange={(value) => setMode(value === "single" ? "single" : "learnt_taught")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="learnt_taught">Learnt and taught</SelectItem>
                  <SelectItem value="single">Single completion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`item-active-${item?.id ?? category.id}`}>Enabled</Label>
              <Switch id={`item-active-${item?.id ?? category.id}`} checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
