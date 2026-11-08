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
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="h-9 gap-1.5 px-3">
        <Plus className="size-4" />
        Log a flight
      </Button>
      <FlightDialog open={open} onOpenChange={setOpen} context={context} />
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
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <FlightDialog open={open} onOpenChange={setOpen} context={context} flight={flight} />
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{flight ? "Edit flight" : "Log a flight"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
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
                      {student.name}
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
          </div>
          {!aircraftId ? (
            <div className="space-y-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dual-hours">Dual hours</Label>
              <Input id="dual-hours" inputMode="decimal" value={dualHours} onChange={(event) => setDualHours(event.target.value)} placeholder="0.0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solo-hours">Solo hours</Label>
              <Input id="solo-hours" inputMode="decimal" value={soloHours} onChange={(event) => setSoloHours(event.target.value)} placeholder="0.0" />
            </div>
          </div>
          <ExercisePicker
            label="Taught"
            hint="Exercises the student demonstrated. Suggested ones are learnt and not yet taught."
            items={orderItems(context.items, suggested.teach)}
            suggested={new Set(suggested.teach)}
            selected={taught}
            onToggle={(id) => setTaught((current) => toggle(current, id))}
          />
          <ExercisePicker
            label="Learnt"
            hint="Exercises the student was taught. Suggested ones are not learnt yet."
            items={orderItems(context.items, suggested.learn)}
            suggested={new Set(suggested.learn)}
            selected={learnt}
            onToggle={(id) => setLearnt((current) => toggle(current, id))}
          />
          <div className="space-y-2">
            <Label htmlFor="flight-notes">Notes</Label>
            <Textarea id="flight-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
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

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the flight syllabus" />
      <div className="max-h-44 overflow-y-auto rounded-lg border">
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No exercises match.</p>
        ) : (
          visible.map((item) => (
            <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b px-3 last:border-0">
              <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
              <span className="text-sm">{item.name}</span>
              {suggested.has(item.id) ? (
                <span className="ml-auto text-xs text-muted-foreground">Suggested</span>
              ) : null}
            </label>
          ))
        )}
      </div>
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
