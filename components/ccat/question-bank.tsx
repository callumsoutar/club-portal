"use client";

import { useMemo, useState } from "react";

import type { PofQuestion, PofTopic } from "@/lib/ccat/questions";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/flight/ui/select";

export function QuestionBank({
  topics,
  questions,
}: {
  topics: PofTopic[];
  questions: PofQuestion[];
}) {
  const [topicId, setTopicId] = useState("all");
  const [query, setQuery] = useState("");
  const [askedId, setAskedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (topicId !== "all" && question.topicId !== topicId) return false;
      if (!needle) return true;
      return question.prompt.toLowerCase().includes(needle) || question.topicName.toLowerCase().includes(needle) || String(question.number).includes(needle);
    });
  }, [questions, query, topicId]);

  const asked = filtered.find((question) => question.id === askedId) ?? null;
  const visibleTopics = topics.filter((topic) => filtered.some((question) => question.topicId === topic.id));

  function askOne() {
    if (filtered.length === 0) return;
    const pool = asked ? filtered.filter((question) => question.id !== asked.id) : filtered;
    const source = pool.length > 0 ? pool : filtered;
    const next = source[Math.floor(Math.random() * source.length)];
    setAskedId(next?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <Select
            value={topicId}
            onValueChange={(value) => {
              setTopicId(value ?? "all");
              setAskedId(null);
            }}
          >
            <SelectTrigger className="w-full" aria-label="Topic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setAskedId(null);
          }}
          placeholder="Search questions"
          aria-label="Search questions"
          className="sm:max-w-sm"
        />
        <Button type="button" onClick={askOne} disabled={filtered.length === 0} className="sm:ml-auto">
          Ask one
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "question" : "questions"}
      </p>
      {asked ? (
        <section className="rounded-xl border bg-card p-5" aria-live="polite">
          <p className="text-xs font-medium text-primary">{asked.topicName} · {asked.number}</p>
          <p className="mt-2 text-lg font-medium text-balance">{asked.prompt}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={askOne}>
            Another question
          </Button>
        </section>
      ) : null}
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          No questions match that search.
        </p>
      ) : (
        visibleTopics.map((topic) => (
          <section key={topic.id} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{topic.name}</h2>
            <ol className="divide-y rounded-xl border bg-card">
              {filtered
                .filter((question) => question.topicId === topic.id)
                .map((question) => (
                  <li key={question.id} className="flex gap-3 px-3 py-3">
                    <span className="w-8 shrink-0 pt-0.5 text-sm text-muted-foreground tabular-nums">{question.number}</span>
                    <p className="text-sm">{question.prompt}</p>
                  </li>
                ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
