"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { TrainingDashboardView } from "@/components/flight/training-dashboard";
import { Button } from "@/components/flight/ui/button";
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
import { Textarea } from "@/components/flight/ui/textarea";
import { recordFlightTest, recordLesson } from "@/lib/flight/actions/training";
import type { TrainingDashboard } from "@/lib/flight/training";

const fieldClass = "h-9 w-full rounded-lg border bg-card px-3 text-sm";

type LessonOption = { id: string; syllabusName: string; order: number; title: string };
type EnrollmentOption = { id: string; label: string };
type InstructorOption = { id: string; name: string };

function Choice({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "h-9 flex-1 rounded-lg bg-foreground text-sm font-medium text-background"
          : "h-9 flex-1 rounded-lg border bg-card text-sm font-medium"
      }
    >
      {children}
    </button>
  );
}

function LessonDialog({
  open,
  lessonId,
  userId,
  lessons,
  instructors,
  today,
  defaultInstructorId,
  onOpenChange,
}: {
  open: boolean;
  lessonId: string | null;
  userId: string;
  lessons: LessonOption[];
  instructors: InstructorOption[];
  today: string;
  defaultInstructorId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const preset = lessons.find((lesson) => lesson.id === lessonId) ?? null;
  const [choice, setChoice] = useState(preset?.id ?? "");
  const [title, setTitle] = useState(preset?.title ?? "");
  const [status, setStatus] = useState<"pass" | "not yet competent">("pass");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const grouped = new Map<string, LessonOption[]>();
  for (const lesson of lessons) {
    const list = grouped.get(lesson.syllabusName) ?? [];
    list.push(lesson);
    grouped.set(lesson.syllabusName, list);
  }

  function close(next: boolean) {
    if (!next) {
      setChoice(preset?.id ?? "");
      setTitle(preset?.title ?? "");
      setStatus("pass");
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a lesson</DialogTitle>
          <DialogDescription>
            {preset
              ? `${preset.syllabusName} · Lesson ${String(preset.order).padStart(2, "0")}. Change the name if this record should read differently.`
              : "Choose the syllabus lesson, then adjust the name if you need to."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const selected = preset?.id ?? choice;
            const additional = selected === "additional";
            if (!selected) {
              setError("Choose a lesson.");
              return;
            }
            if (!title.trim()) {
              setError("Enter a lesson name.");
              return;
            }
            startTransition(async () => {
              const result = await recordLesson({
                userId,
                lessonId: additional ? "" : selected,
                lessonTitle: title.trim(),
                date: String(form.get("date") ?? ""),
                status,
                instructorId: String(form.get("instructorId") ?? ""),
                lessonHighlights: String(form.get("lessonHighlights") ?? ""),
                areasForImprovement: String(form.get("areasForImprovement") ?? ""),
                focusNextLesson: String(form.get("focusNextLesson") ?? ""),
                instructorComments: String(form.get("instructorComments") ?? ""),
                safetyConcerns: String(form.get("safetyConcerns") ?? ""),
                weatherConditions: String(form.get("weatherConditions") ?? ""),
              });
              if (!result.ok) {
                setError(result.error ?? "Could not save.");
                return;
              }
              toast.success("Lesson recorded");
              close(false);
            });
          }}
        >
          {preset ? null : (
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-choice">Lesson</Label>
              <select
                id="lesson-choice"
                className={fieldClass}
                value={choice}
                onChange={(event) => {
                  const next = event.target.value;
                  setChoice(next);
                  setTitle(next === "additional" ? "" : lessons.find((lesson) => lesson.id === next)?.title ?? "");
                }}
                required
              >
                <option value="">Choose a lesson</option>
                {[...grouped.entries()].map(([syllabusName, items]) => (
                  <optgroup key={syllabusName} label={syllabusName}>
                    {items.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {String(lesson.order).padStart(2, "0")}. {lesson.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="additional">Additional training</option>
              </select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="lessonTitle">Lesson name</Label>
            <Input
              id="lessonTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="What was covered"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-date">Date</Label>
            <Input id="lesson-date" name="date" type="date" required defaultValue={today} />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Outcome</span>
            <div className="flex gap-2">
              <Choice pressed={status === "pass"} onClick={() => setStatus("pass")}>Competent</Choice>
              <Choice pressed={status === "not yet competent"} onClick={() => setStatus("not yet competent")}>Not yet competent</Choice>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="instructorId">Instructor</Label>
            <select id="instructorId" name="instructorId" className={fieldClass} defaultValue={defaultInstructorId ?? ""}>
              <option value="">Not recorded</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
              ))}
            </select>
          </div>
          <details className="rounded-lg border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Debrief</summary>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lessonHighlights">What went well</Label>
                <Textarea id="lessonHighlights" name="lessonHighlights" rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="areasForImprovement">Areas for improvement</Label>
                <Textarea id="areasForImprovement" name="areasForImprovement" rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="focusNextLesson">Focus next lesson</Label>
                <Input id="focusNextLesson" name="focusNextLesson" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="instructorComments">Comments</Label>
                <Textarea id="instructorComments" name="instructorComments" rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="safetyConcerns">Safety</Label>
                <Textarea id="safetyConcerns" name="safetyConcerns" rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="weatherConditions">Weather</Label>
                <Input id="weatherConditions" name="weatherConditions" />
              </div>
            </div>
          </details>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FlightTestDialog({
  open,
  userEnrollments,
  today,
  onOpenChange,
}: {
  open: boolean;
  userEnrollments: EnrollmentOption[];
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [result, setResult] = useState<"pass" | "fail">("pass");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (!next) {
      setResult("pass");
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a flight test</DialogTitle>
          <DialogDescription>Pass or fail for this syllabus.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const saved = await recordFlightTest({
                enrollmentId: String(form.get("enrollmentId") ?? userEnrollments[0]?.id ?? ""),
                result,
                testDate: String(form.get("testDate") ?? ""),
                notes: String(form.get("notes") ?? ""),
              });
              if (!saved.ok) {
                setError(saved.error ?? "Could not save.");
                return;
              }
              toast.success("Flight test recorded");
              close(false);
            });
          }}
        >
          {userEnrollments.length > 1 ? (
            <div className="grid gap-1.5">
              <Label htmlFor="enrollmentId">Syllabus</Label>
              <select id="enrollmentId" name="enrollmentId" className={fieldClass} defaultValue={userEnrollments[0]?.id}>
                {userEnrollments.map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>{enrollment.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="enrollmentId" value={userEnrollments[0]?.id ?? ""} />
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="testDate">Date</Label>
            <Input id="testDate" name="testDate" type="date" required defaultValue={today} />
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Result</span>
            <div className="flex gap-2">
              <Choice pressed={result === "pass"} onClick={() => setResult("pass")}>Pass</Choice>
              <Choice pressed={result === "fail"} onClick={() => setResult("fail")}>Fail</Choice>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save flight test"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InstructorTraining({
  data,
  timeZone,
  userId,
  lessons,
  enrollments,
  instructors,
  today,
  defaultInstructorId,
}: {
  data: TrainingDashboard;
  timeZone: string;
  userId: string;
  lessons: LessonOption[];
  enrollments: EnrollmentOption[];
  instructors: InstructorOption[];
  today: string;
  defaultInstructorId: string | null;
}) {
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonSession, setLessonSession] = useState(0);
  const [testOpen, setTestOpen] = useState(false);

  function openLesson(id: string | null) {
    setLessonId(id);
    setLessonSession((session) => session + 1);
    setLessonOpen(true);
  }

  return (
    <>
      <TrainingDashboardView
        data={data}
        timeZone={timeZone}
        today={today}
        onRecordLesson={openLesson}
        onRecordFlightTest={enrollments.length > 0 ? () => setTestOpen(true) : undefined}
      />
      <LessonDialog
        key={lessonSession}
        open={lessonOpen}
        lessonId={lessonId}
        userId={userId}
        lessons={lessons}
        instructors={instructors}
        today={today}
        defaultInstructorId={defaultInstructorId}
        onOpenChange={setLessonOpen}
      />
      {enrollments.length > 0 ? (
        <FlightTestDialog open={testOpen} userEnrollments={enrollments} today={today} onOpenChange={setTestOpen} />
      ) : null}
    </>
  );
}
