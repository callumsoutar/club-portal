import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  safetyArticleHref,
  type SafetyArticleSummary,
} from "@/lib/safety-messages";
import { cn } from "@/lib/utils";

const CATEGORY_DOTS: Record<string, string> = {
  "Aerodrome & Circuit": "bg-sky-500",
  "Aircraft & Engine": "bg-slate-500",
  Airmanship: "bg-blue-600",
  "Airspace & Radio": "bg-violet-500",
  Emergencies: "bg-red-500",
  "Ground Ops": "bg-amber-500",
  "Human Factors": "bg-pink-500",
  "Procedures & SOPs": "bg-teal-600",
  Weather: "bg-cyan-500",
};

export function CategoryDot({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        CATEGORY_DOTS[category] ?? "bg-muted-foreground",
        className,
      )}
    />
  );
}

export function ArticleMeta({
  article,
  showCategory = true,
  className,
}: {
  article: Pick<SafetyArticleSummary, "category" | "date" | "read">;
  showCategory?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {showCategory ? (
        <>
          <CategoryDot category={article.category} />
          <span className="font-medium text-foreground/75">{article.category}</span>
          <span aria-hidden>·</span>
        </>
      ) : null}
      {article.date ? (
        <>
          <span>{article.date}</span>
          <span aria-hidden>·</span>
        </>
      ) : null}
      <span>{article.read}</span>
    </p>
  );
}

/** One article in a list. Rows are separated by the parent's dividers. */
export function ArticleRow({
  article,
  headingLevel: Heading = "h3",
  showSummary = true,
}: {
  article: SafetyArticleSummary;
  headingLevel?: "h2" | "h3";
  showSummary?: boolean;
}) {
  return (
    <Link
      href={safetyArticleHref(article.slug)}
      className="group -mx-3 flex items-start gap-4 rounded-lg px-3 py-4 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1">
        <ArticleMeta article={article} />
        <Heading className="mt-1.5 text-[15px] leading-snug font-semibold text-pretty text-foreground group-hover:text-primary sm:text-base">
          {article.title}
        </Heading>
        {showSummary && article.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {article.description}
          </p>
        ) : null}
      </div>
      <ArrowRight
        aria-hidden
        className="mt-6 hidden size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block"
      />
    </Link>
  );
}

export function ArticleList({
  articles,
  headingLevel,
  showSummary,
}: {
  articles: SafetyArticleSummary[];
  headingLevel?: "h2" | "h3";
  showSummary?: boolean;
}) {
  return (
    <ul className="divide-y divide-border/70">
      {articles.map((article) => (
        <li key={article.slug}>
          <ArticleRow
            article={article}
            headingLevel={headingLevel}
            showSummary={showSummary}
          />
        </li>
      ))}
    </ul>
  );
}
