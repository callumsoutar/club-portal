import { TrainingProgrammeForms } from "@/components/flight/training-programme-forms";

export function TrainingProgrammes({
  syllabi,
  members,
  instructors,
}: {
  syllabi: Array<{
    id: string;
    name: string;
    licenceType: string | null;
    lessons: Array<{ sortOrder: number; name: string; isRequired: boolean }>;
  }>;
  members: Array<{ id: string; name: string }>;
  instructors: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Create a syllabus, add its lessons, and enrol the people who are training now.
      </p>
      {syllabi.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {syllabi.map((syllabus) => (
            <li key={syllabus.id} className="px-4 py-3">
              <p className="text-sm font-medium">
                {syllabus.name}
                {syllabus.licenceType ? <span className="ml-2 text-muted-foreground">{syllabus.licenceType.toUpperCase()}</span> : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {syllabus.lessons.length
                  ? syllabus.lessons.map((lesson) => `${lesson.sortOrder}. ${lesson.name}${lesson.isRequired ? "" : " (optional)"}`).join(" · ")
                  : "No lessons yet"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No syllabi yet.</p>
      )}
      <TrainingProgrammeForms
        syllabi={syllabi.map((syllabus) => ({ id: syllabus.id, name: syllabus.name }))}
        members={members}
        instructors={instructors}
      />
    </div>
  );
}
