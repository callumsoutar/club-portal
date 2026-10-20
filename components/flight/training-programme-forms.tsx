"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import { Label } from "@/components/flight/ui/label";
import { createLesson, createSyllabus, enrollStudent } from "@/lib/flight/actions/training";

const fieldClass = "h-9 w-full rounded-lg border bg-card px-3 text-sm";

export function TrainingProgrammeForms({
  syllabi,
  members,
  instructors,
}: {
  syllabi: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  instructors: Array<{ id: string; name: string }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          startTransition(async () => {
            const result = await createSyllabus({
              name: String(form.get("name") ?? ""),
              description: String(form.get("description") ?? ""),
              licenceType: String(form.get("licenceType") ?? ""),
            });
            setMessage(result.ok ? "Syllabus created." : result.error ?? "Could not save.");
            if (result.ok) formElement.reset();
          });
        }}
      >
        <h2 className="text-sm font-semibold">New syllabus</h2>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
        <Label htmlFor="description">Qualification</Label>
        <Input id="description" name="description" placeholder="Private pilot licence" />
        <Label htmlFor="licenceType">Licence</Label>
        <select id="licenceType" name="licenceType" className={fieldClass} defaultValue="">
          <option value="">Not set</option>
          <option value="student">Student</option>
          <option value="rpl">RPL</option>
          <option value="ppl">PPL</option>
          <option value="cpl">CPL</option>
          <option value="atpl">ATPL</option>
          <option value="instructor">Instructor</option>
        </select>
        <Button type="submit" disabled={pending}>Create syllabus</Button>
      </form>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          startTransition(async () => {
            const result = await createLesson({
              syllabusId: String(form.get("syllabusId") ?? ""),
              name: String(form.get("lessonName") ?? ""),
              isRequired: form.get("isRequired") === "on",
            });
            setMessage(result.ok ? "Lesson added." : result.error ?? "Could not save.");
            if (result.ok) formElement.reset();
          });
        }}
      >
        <h2 className="text-sm font-semibold">Add a lesson</h2>
        <Label htmlFor="syllabusId">Syllabus</Label>
        <select id="syllabusId" name="syllabusId" className={fieldClass} required defaultValue={syllabi[0]?.id ?? ""}>
          {syllabi.map((syllabus) => (
            <option key={syllabus.id} value={syllabus.id}>{syllabus.name}</option>
          ))}
        </select>
        <Label htmlFor="lessonName">Lesson</Label>
        <Input id="lessonName" name="lessonName" required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRequired" defaultChecked />
          Required for completion
        </label>
        <Button type="submit" disabled={pending || syllabi.length === 0}>Add lesson</Button>
      </form>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await enrollStudent({
              userId: String(form.get("userId") ?? ""),
              syllabusId: String(form.get("enrollSyllabusId") ?? ""),
              instructorId: String(form.get("instructorId") ?? ""),
            });
            setMessage(result.ok ? "Student enrolled." : result.error ?? "Could not enrol.");
          });
        }}
      >
        <h2 className="text-sm font-semibold">Enrol a student</h2>
        <Label htmlFor="userId">Student</Label>
        <select id="userId" name="userId" className={fieldClass} required defaultValue="">
          <option value="" disabled>Choose a member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
        <Label htmlFor="enrollSyllabusId">Syllabus</Label>
        <select id="enrollSyllabusId" name="enrollSyllabusId" className={fieldClass} required defaultValue={syllabi[0]?.id ?? ""}>
          {syllabi.map((syllabus) => (
            <option key={syllabus.id} value={syllabus.id}>{syllabus.name}</option>
          ))}
        </select>
        <Label htmlFor="instructorId">Primary instructor</Label>
        <select id="instructorId" name="instructorId" className={fieldClass} defaultValue="">
          <option value="">None</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending || syllabi.length === 0}>Enrol</Button>
      </form>
      {message ? <p className="text-sm text-muted-foreground lg:col-span-3">{message}</p> : null}
    </div>
  );
}
