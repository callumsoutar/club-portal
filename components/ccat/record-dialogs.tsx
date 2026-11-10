"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { recordSignoff, saveIntake, saveStudent, updateSignoff, voidSignoff } from "@/lib/ccat/actions";
import type { SignoffStamp } from "@/lib/ccat/progress";
import type { EventKind } from "@/lib/ccat/types";
import type { CcatIntake, CcatStudent } from "@/lib/ccat/types";
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
import { Textarea } from "@/components/flight/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/flight/ui/tooltip";
import { cn } from "@/lib/utils";

export function IntakeButton({ intake }: { intake?: CcatIntake }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(intake?.name ?? "");
  const [startsOn, setStartsOn] = useState(intake?.startsOn ?? "");
  const [status, setStatus] = useState<"active" | "archived">(intake?.status ?? "active");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveIntake({ id: intake?.id, name, startsOn, status });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save the intake.");
      return;
    }
    toast.success(intake ? "Intake updated" : "Intake added");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant={intake ? "outline" : "outline"} onClick={() => setOpen(true)} className="h-9">
        {intake ? "Edit intake" : "New intake"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intake ? "Edit intake" : "New intake"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intake-name">Name</Label>
              <Input id="intake-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intake-start">Start date</Label>
              <Input id="intake-start" type="date" value={startsOn ?? ""} onChange={(event) => setStartsOn(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value === "archived" ? "archived" : "active")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
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

export function StudentButton({
  intakes,
  profiles,
  student,
}: {
  intakes: CcatIntake[];
  profiles: { id: string; fullName: string; email: string }[];
  student?: CcatStudent;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [intakeId, setIntakeId] = useState(student?.intakeId ?? "");
  const [profileId, setProfileId] = useState(student?.profileId ?? "");
  const [status, setStatus] = useState(student?.status ?? "active");
  const [startedOn, setStartedOn] = useState(student?.startedOn ?? "");
  const [notes, setNotes] = useState(student?.notes ?? "");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveStudent({
      id: student?.id,
      fullName,
      intakeId,
      profileId,
      status,
      startedOn,
      notes,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not save the student.");
      return;
    }
    toast.success(student ? "Student updated" : "Student added");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant={student ? "outline" : "outline"} onClick={() => setOpen(true)} className="h-9 gap-1.5">
        {student ? null : <Plus className="size-4" />}
        {student ? "Edit student" : "Add student"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{student ? "Edit student" : "Add student"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-name">Name</Label>
              <Input id="student-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Intake</Label>
                <Select value={intakeId || "none"} onValueChange={(value) => setIntakeId(value === "none" ? "" : value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Intake" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No intake</SelectItem>
                    {intakes.map((intake) => (
                      <SelectItem key={intake.id} value={intake.id}>{intake.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-start">Start date</Label>
                <Input id="student-start" type="date" value={startedOn ?? ""} onChange={(event) => setStartedOn(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Login</Label>
              <Select value={profileId || "none"} onValueChange={(value) => setProfileId(value === "none" ? "" : value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No login yet</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Linking a login lets the student open their own read-only record.</p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value === "completed" || value === "withdrawn" ? value : "active")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-notes">Notes</Label>
              <Textarea id="student-notes" value={notes ?? ""} onChange={(event) => setNotes(event.target.value)} />
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

export function SignoffButton({
  studentId,
  itemId,
  itemName,
  kind,
  today,
  instructors,
  defaultInstructorId,
  label,
  underline = false,
  existing,
}: {
  studentId: string;
  itemId: string;
  itemName: string;
  kind: EventKind;
  today: string;
  instructors: { id: string; name: string }[];
  defaultInstructorId: string;
  label: string;
  underline?: boolean;
  /** When set, the dialog updates this record instead of creating one. */
  existing?: SignoffStamp;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [eventDate, setEventDate] = useState(today);
  const [instructorId, setInstructorId] = useState(defaultInstructorId);
  const [notes, setNotes] = useState("");

  const named = kind === "delivered" || kind === "received";
  const [instructorName, setInstructorName] = useState(
    () => instructors.find((instructor) => instructor.id === defaultInstructorId)?.name ?? "",
  );
  const fieldKey = existing?.eventId ?? `${itemId}-${kind}`;

  function chooseInstructor(value: string) {
    if (value === "none") {
      setInstructorId("");
      return;
    }
    setInstructorId(value);
    const match = instructors.find((instructor) => instructor.id === value);
    if (match) setInstructorName(match.name);
  }

  function openDialog() {
    setEventDate(existing?.date ?? today);
    setInstructorId(existing ? existing.instructorId ?? "" : defaultInstructorId);
    setInstructorName(
      existing
        ? existing.instructorName ?? ""
        : instructors.find((instructor) => instructor.id === defaultInstructorId)?.name ?? "",
    );
    setNotes(existing?.notes ?? "");
    setOpen(true);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const payload = {
      eventDate,
      instructorId,
      instructorName: named ? instructorName : undefined,
      notes,
    };
    const result = existing
      ? await updateSignoff({ id: existing.eventId, ...payload })
      : await recordSignoff({ studentId, itemId, kind, ...payload });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? (existing ? "Could not update the sign-off." : "Could not record the sign-off."));
      return;
    }
    toast.success(existing ? "Sign-off updated" : "Sign-off recorded");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {existing ? (
        <button type="button" onClick={openDialog} className="text-xs text-muted-foreground hover:text-foreground">
          {label}
        </button>
      ) : (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={openDialog}
          className={cn(
            "h-auto px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground",
            underline && "underline decoration-primary/50 underline-offset-4 hover:decoration-primary",
          )}
        >
          {label}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{existing ? signoffEditTitle(kind) : signoffTitle(kind)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{itemName}</p>
            {kind === "received" && !existing ? (
              <p className="text-sm text-muted-foreground">Signed once. This means the student has received it.</p>
            ) : null}
            {kind === "delivered" && !existing ? (
              <p className="text-sm text-muted-foreground">You can record another delivery whenever it is given again.</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`signoff-date-${fieldKey}`}>Date</Label>
              <Input id={`signoff-date-${fieldKey}`} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select value={instructorId || "none"} onValueChange={chooseInstructor}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not listed</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>{instructor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {named ? (
              <div className="space-y-2">
                <Label htmlFor={`signoff-name-${fieldKey}`}>Instructor name</Label>
                <Input
                  id={`signoff-name-${fieldKey}`}
                  value={instructorName}
                  onChange={(event) => setInstructorName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`signoff-notes-${fieldKey}`}>Notes</Label>
              <Textarea id={`signoff-notes-${fieldKey}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
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

function signoffTitle(kind: EventKind) {
  if (kind === "learnt") return "Record learnt";
  if (kind === "taught") return "Record taught";
  if (kind === "delivered") return "Record delivery";
  if (kind === "received") return "Mark received";
  return "Record completion";
}

function signoffEditTitle(kind: EventKind) {
  if (kind === "learnt") return "Edit learnt";
  if (kind === "taught") return "Edit taught";
  if (kind === "delivered") return "Edit delivery";
  if (kind === "received") return "Edit received";
  return "Edit sign-off";
}

export function ClearSignoffButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function clear() {
    if (!window.confirm("Remove this sign-off? The original entry stays in the audit trail.")) return;
    setPending(true);
    const result = await voidSignoff(id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not remove the sign-off.");
      return;
    }
    toast.success("Sign-off removed");
    router.refresh();
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={clear}
          disabled={pending}
          aria-label="Undo"
          className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Undo2 className="size-3.5" aria-hidden />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Undo</TooltipContent>
    </Tooltip>
  );
}
