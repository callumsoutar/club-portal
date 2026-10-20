import { redirect } from "next/navigation";

export default function TrainingProgrammesRedirect() {
  redirect("/admin/settings?tab=training");
}
