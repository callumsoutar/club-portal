import "server-only";

import { createServerSupabase } from "@/lib/flight/supabase/server";

export interface PofTopic {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PofQuestion {
  id: string;
  topicId: string;
  topicName: string;
  number: number;
  prompt: string;
}

export async function getPofQuestions(): Promise<{ topics: PofTopic[]; questions: PofQuestion[] }> {
  const supabase = await createServerSupabase();
  const [topics, questions] = await Promise.all([
    supabase.from("ccat_question_topics").select("id, name, sort_order").order("sort_order"),
    supabase.from("ccat_questions").select("id, topic_id, number, prompt").eq("is_active", true).order("number"),
  ]);

  const topicRows = ((topics.data ?? []) as { id: string; name: string; sort_order: number }[]).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
  const names = new Map(topicRows.map((topic) => [topic.id, topic.name]));

  return {
    topics: topicRows,
    questions: ((questions.data ?? []) as { id: string; topic_id: string; number: number; prompt: string }[]).map((row) => ({
      id: row.id,
      topicId: row.topic_id,
      topicName: names.get(row.topic_id) ?? "",
      number: row.number,
      prompt: row.prompt,
    })),
  };
}
