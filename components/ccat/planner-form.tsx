"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { saveWeekPlan } from "@/lib/ccat/actions";
import type { CcatPlan } from "@/lib/ccat/types";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";
import { Textarea } from "@/components/flight/ui/textarea";

interface PlannerStudent {
  id: string;
  name: string;
}

interface Draft {
  included: boolean;
  instructorId: string;
  aircraftRegistration: string;
  notes: string;
  learntItemIds: string[];
  taughtItemIds: string[];
}

export function PlannerForm({
  weekStart,
  students,
  instructors,
  aircraft,
  items,
  plans,
}: {
  weekStart: string;
  students: PlannerStudent[];
  instructors: { id: string; name: string }[];
  aircraft: { registration: string }[];
  items: { id: string; name: string }[];
  plans: CcatPlan[];
}) {
  const router = useRouter();
  const initial = useMemo(() => {
    const drafts: Record<string, Draft> = {};
    for (const student of students) {
      const plan = plans.find((entry) => entry.studentId === student.id);
      drafts[student.id] = {
        included: Boolean(plan),
        instructorId: plan?.instructorId ?? "",
        aircraftRegistration: plan?.aircraftRegistration ?? "",
        notes: plan?.notes ?? "",
        learntItemIds: plan?.items.filter((item) => item.kind === "learnt").map((item) => item.itemId) ?? [],
        taughtItemIds: plan?.items.filter((item) => item.kind === "taught").map((item) => item.itemId) ?? [],
      };
    }
    return drafts;
  }, [plans, students]);
  const [drafts, setDrafts] = useState(initial);
  const [pending, setPending] = useState(false);

  function patch(studentId: string, partial: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...partial } }));
  }

  async function save() {
    setPending(true);
    const result = await saveWeekPlan({
      weekStart,
      plans: students
        .filter((student) => drafts[student.id]?.included)
        .map((student) => ({
          studentId: student.id,
          instructorId: drafts[student.id]?.instructorId ?? "",
          aircraftRegistration: drafts[student.id]?.aircraftRegistration ?? "",
          notes: drafts[student.id]?.notes ?? "",
          learntItemIds: drafts[student.id]?.learntItemIds ?? [],
          taughtItemIds: drafts[student.id]?.taughtItemIds ?? [],
        })),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save the plan.");
      return;
    }
    toast.success("Weekly plan saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {students.map((student) => {
        const draft = drafts[student.id];
        if (!draft) return null;
        return (
          <section key={student.id} className="rounded-xl border bg-card p-4">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="size-4"
                checked={draft.included}
                onChange={(event) => patch(student.id, { included: event.target.checked })}
              />
              <span className="font-medium">{student.name}</span>
            </label>
            {draft.included ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Instructor</Label>
                    <Select value={draft.instructorId || "none"} onValueChange={(value) => patch(student.id, { instructorId: value === "none" ? "" : value })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>{instructor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Aircraft</Label>
                    <Input
                      list={`aircraft-${student.id}`}
                      value={draft.aircraftRegistration}
                      onChange={(event) => patch(student.id, { aircraftRegistration: event.target.value.toUpperCase() })}
                    />
                    <datalist id={`aircraft-${student.id}`}>
                      {aircraft.map((entry) => <option key={entry.registration} value={entry.registration} />)}
                    </datalist>
                  </div>
                </div>
                <ExerciseSelect
                  label="Plan to teach"
                  items={items}
                  selected={draft.taughtItemIds}
                  onChange={(taughtItemIds) => patch(student.id, { taughtItemIds })}
                />
                <ExerciseSelect
                  label="Plan to learn"
                  items={items}
                  selected={draft.learntItemIds}
                  onChange={(learntItemIds) => patch(student.id, { learntItemIds })}
                />
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={draft.notes} onChange={(event) => patch(student.id, { notes: event.target.value })} />
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save week
        </Button>
      </div>
    </div>
  );
}

function ExerciseSelect({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.id} className="flex min-h-10 items-center gap-2 px-1 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={selected.includes(item.id)}
              onChange={() => onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
