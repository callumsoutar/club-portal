import { redirect } from "next/navigation";

import { QuestionBank } from "@/components/ccat/question-bank";
import { Page, PageHeader } from "@/components/portal/page";
import { getPofQuestions } from "@/lib/ccat/questions";
import { hasRole, requireUser } from "@/lib/flight/auth";
import { createServerSupabase } from "@/lib/flight/supabase/server";

export const metadata = { title: "POF questions" };

export default async function PofQuestionsPage() {
  const user = await requireUser();
  const staff = hasRole(user.profile.role, "instructor");
  if (!staff) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("ccat_students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!data) redirect("/fly");
  }
  const { topics, questions } = await getPofQuestions();

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Training"
        title="POF questions"
        description="Oral questions for C Cat students, grouped by topic. Ask one at a time, or browse a topic."
        back={staff ? { href: "/training", label: "C Cat Tracker" } : { href: "/training/me", label: "My training" }}
      />
      <QuestionBank topics={topics} questions={questions} />
    </Page>
  );
}
