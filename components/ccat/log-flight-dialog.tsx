"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { saveFlight, voidFlight } from "@/lib/ccat/actions";
import type { FlightFormContext } from "@/lib/ccat/present";
import { Button } from "@/components/flight/ui/button";
import { Checkbox } from "@/components/flight/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/flight/ui/textarea";

export interface FlightDraft {
  id: string;
  studentId: string;
  flownOn: string;
  aircraftId: string | null;
  aircraftRegistration: string | null;
  instructorId: string | null;
  dualHours: number;
  soloHours: number;
  notes: string | null;
  learntItemIds: string[];
  taughtItemIds: string[];
}

export function LogFlightButton({ context }: { context: FlightFormContext }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
        className="h-9 gap-1.5 px-3"
      >
        <Plus className="size-4" />
        Log a flight
      </Button>
      <FlightDialog key={session} open={open} onOpenChange={setOpen} context={context} />
    </>
  );
}

export function EditFlightButton({
  context,
  flight,
}: {
  context: FlightFormContext;
  flight: FlightDraft;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
      >
        Edit
      </Button>
      <FlightDialog key={session} open={open} onOpenChange={setOpen} context={context} flight={flight} />
    </>
  );
}

export function RemoveFlightButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("Remove this flight from the training record? The sign-offs recorded on it will be removed too.")) return;
    setPending(true);
    const result = await voidFlight(id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not remove the flight.");
      return;
    }
    toast.success("Flight removed");
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
      Remove
    </Button>
  );
}

function FlightDialog({
  open,
  onOpenChange,
  context,
  flight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: FlightFormContext;
  flight?: FlightDraft;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [studentId, setStudentId] = useState(flight?.studentId ?? context.students[0]?.id ?? "");
  const [flownOn, setFlownOn] = useState(flight?.flownOn ?? context.today);
  const [aircraftId, setAircraftId] = useState(flight?.aircraftId ?? "");
  const [registration, setRegistration] = useState(
    flight && !flight.aircraftId ? flight.aircraftRegistration ?? "" : "",
  );
  const [instructorId, setInstructorId] = useState(flight?.instructorId ?? context.defaultInstructorId);
  const [dualHours, setDualHours] = useState(String(flight?.dualHours ?? ""));
  const [soloHours, setSoloHours] = useState(String(flight?.soloHours ?? ""));
  const [notes, setNotes] = useState(flight?.notes ?? "");
  const [learnt, setLearnt] = useState<string[]>(flight?.learntItemIds ?? []);
  const [taught, setTaught] = useState<string[]>(flight?.taughtItemIds ?? []);

  const suggested = context.suggestions[studentId] ?? { learn: [], teach: [] };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveFlight({
      id: flight?.id,
      studentId,
      flownOn,
      aircraftId: aircraftId || "",
      registration: aircraftId ? "" : registration,
      instructorId: instructorId || "",
      dualHours: Number(dualHours || 0),
      soloHours: Number(soloHours || 0),
      notes,
      learntItemIds: learnt,
      taughtItemIds: taught,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save the flight.");
      return;
    }
    toast.success(flight ? "Flight updated" : "Flight logged");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>{flight ? "Edit flight" : "Log a flight"}</DialogTitle>
          <DialogDescription>
            Record who flew, then tick the lessons learnt on this sortie and the ones taught back.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Flight</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select
                    value={studentId}
                    onValueChange={(value) => {
                      setStudentId(value);
                      if (!flight) {
                        setLearnt([]);
                        setTaught([]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.intake ? `${student.name} · ${student.intake}` : student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flown-on">Date</Label>
                  <Input id="flown-on" type="date" value={flownOn} onChange={(event) => setFlownOn(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Aircraft</Label>
                  <Select value={aircraftId || "other"} onValueChange={(value) => setAircraftId(value === "other" ? "" : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Registration" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.aircraft.map((aircraft) => (
                        <SelectItem key={aircraft.id} value={aircraft.id}>
                          {aircraft.registration}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other registration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instructor</Label>
                  <Select value={instructorId || "none"} onValueChange={(value) => setInstructorId(value === "none" ? "" : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not listed</SelectItem>
                      {context.instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dual-hours">Dual hours</Label>
                  <Input id="dual-hours" inputMode="decimal" value={dualHours} onChange={(event) => setDualHours(event.target.value)} placeholder="1.2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solo-hours">Solo hours</Label>
                  <Input id="solo-hours" inputMode="decimal" value={soloHours} onChange={(event) => setSoloHours(event.target.value)} placeholder="0.0" />
                </div>
              </div>
              {!aircraftId ? (
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="registration">Registration</Label>
                  <Input
                    id="registration"
                    value={registration}
                    onChange={(event) => setRegistration(event.target.value.toUpperCase())}
                    placeholder="ZK-ABC"
                    className="uppercase"
                  />
                </div>
              ) : null}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Lessons on this flight</legend>
              <p className="text-sm text-muted-foreground">
                Suggested lessons are the ones this student is ready for. Tick taught when they demonstrated it, and learnt when you taught it to them.
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <ExercisePicker
                  label="Taught"
                  hint="Demonstrated by the student."
                  items={orderItems(context.items, suggested.teach)}
                  suggested={new Set(suggested.teach)}
                  selected={taught}
                  onToggle={(id) => setTaught((current) => toggle(current, id))}
                />
                <ExercisePicker
                  label="Learnt"
                  hint="Shown to the student."
                  items={orderItems(context.items, suggested.learn)}
                  suggested={new Set(suggested.learn)}
                  selected={learnt}
                  onToggle={(id) => setLearnt((current) => toggle(current, id))}
                />
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="flight-notes">Notes</Label>
              <Textarea id="flight-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional. Weather, handling notes, what to cover next." />
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !studentId}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save flight
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExercisePicker({
  label,
  hint,
  items,
  suggested,
  selected,
  onToggle,
}: {
  label: string;
  hint: string;
  items: { id: string; name: string }[];
  suggested: Set<string>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => !term || item.name.toLowerCase().includes(term));
  }, [items, query]);

  const pinned = visible.filter((item) => suggested.has(item.id));
  const rest = visible.filter((item) => !suggested.has(item.id));

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{selected.length} selected</p>
      </div>
      {pinned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {pinned.map((item) => {
            const on = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(item.id)}
                className={
                  on
                    ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                }
              >
                {item.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter lessons" aria-label={`Filter ${label.toLowerCase()} lessons`} />
      {rest.length === 0 && pinned.length === 0 ? (
        <p className="rounded-lg border px-3 py-4 text-sm text-muted-foreground">No lessons match.</p>
      ) : rest.length > 0 ? (
        <div className="max-h-48 overflow-y-auto rounded-lg border">
          {rest.map((item) => (
            <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-3 border-b px-3 last:border-0">
              <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
              <span className="text-sm">{item.name}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function orderItems(items: { id: string; name: string; sortOrder: number }[], suggested: string[]) {
  const rank = new Map(suggested.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const left = rank.get(a.id) ?? 1000 + a.sortOrder;
    const right = rank.get(b.id) ?? 1000 + b.sortOrder;
    return left - right;
  });
}

function toggle(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}
