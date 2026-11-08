import { redirect } from "next/navigation";

export default function LegacyInstructorTrainingPage() {
  redirect("/training/enrolments");
}
