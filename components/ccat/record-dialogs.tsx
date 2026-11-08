"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { recordSignoff, saveIntake, saveStudent, voidSignoff } from "@/lib/ccat/actions";
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
}: {
  studentId: string;
  itemId: string;
  itemName: string;
  kind: "learnt" | "taught" | "completed";
  today: string;
  instructors: { id: string; name: string }[];
  defaultInstructorId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [eventDate, setEventDate] = useState(today);
  const [instructorId, setInstructorId] = useState(defaultInstructorId);
  const [notes, setNotes] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await recordSignoff({ studentId, itemId, kind, eventDate, instructorId, notes });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not record the sign-off.");
      return;
    }
    toast.success("Sign-off recorded");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {kind === "learnt" ? "Record learnt" : kind === "taught" ? "Record taught" : "Record completion"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{itemName}</p>
            <div className="space-y-2">
              <Label htmlFor={`signoff-date-${itemId}-${kind}`}>Date</Label>
              <Input id={`signoff-date-${itemId}-${kind}`} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Select value={instructorId || "none"} onValueChange={(value) => setInstructorId(value === "none" ? "" : value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not listed</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>{instructor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`signoff-notes-${itemId}-${kind}`}>Notes</Label>
              <Textarea id={`signoff-notes-${itemId}-${kind}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
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
    <button type="button" onClick={clear} disabled={pending} className="text-xs text-muted-foreground hover:text-foreground">
      Undo
    </button>
  );
}
