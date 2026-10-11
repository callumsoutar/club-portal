"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, SearchX, X } from "lucide-react";

import { ArticleList, CategoryDot } from "@/components/safety/article-row";
import { Button } from "@/components/flight/ui/button";
import { Input } from "@/components/flight/ui/input";
import type { SafetyArticleSummary } from "@/lib/safety-messages";
import { categorySlug } from "@/lib/safety-messages";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

export interface HubCategory {
  name: string;
  slug: string;
  count: number;
}

/**
 * Browse and search published articles. Filters live in the URL
 * (`?category=weather&q=fuel`) so a filtered view can be shared, bookmarked
 * and restored with the back button. Filtering is client-side: the full list
 * is small and this keeps typing instant.
 */
export function SafetyHubBrowser({
  articles,
  categories,
  initialCategory,
  initialQuery,
  excludeSlug,
}: {
  articles: SafetyArticleSummary[];
  categories: HubCategory[];
  initialCategory: string | null;
  initialQuery: string;
  /** Lead article shown above the browser; hidden from the unfiltered list. */
  excludeSlug?: string;
}) {
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState({ key: "", count: PAGE_SIZE });
  const searchRef = useRef<HTMLInputElement>(null);

  const term = deferredQuery.trim().toLowerCase();
  const filterKey = `${category ?? ""}\0${term}`;
  const visibleCount = page.key === filterKey ? page.count : PAGE_SIZE;
  const isFiltered = Boolean(category) || term.length > 0;

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      if (!isFiltered && article.slug === excludeSlug) return false;
      if (category && categorySlug(article.category) !== category) return false;
      if (!term) return true;
      return `${article.title} ${article.description} ${article.category}`
        .toLowerCase()
        .includes(term);
    });
  }, [articles, category, term, isFiltered, excludeSlug]);

  const visible = filtered.slice(0, visibleCount);
  const activeCategory = categories.find((item) => item.slug === category);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    const q = deferredQuery.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [category, deferredQuery]);

  function clearFilters() {
    setCategory(null);
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <section aria-labelledby="browse-heading" className="flex flex-col gap-5">
      <h2 id="browse-heading" className="sr-only">
        Browse articles
      </h2>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Search articles"
            aria-label="Search safety articles"
            className="h-11 bg-card pr-10 pl-9 text-base sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Filter by topic"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <CategoryChip
            label="All topics"
            count={articles.length}
            active={!category}
            onClick={() => setCategory(null)}
          />
          {categories.map((item) => (
            <CategoryChip
              key={item.slug}
              label={item.name}
              count={item.count}
              active={category === item.slug}
              onClick={() =>
                setCategory((current) => (current === item.slug ? null : item.slug))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {resultLabel(filtered.length, activeCategory?.name, deferredQuery.trim(), isFiltered)}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
            <SearchX className="size-5 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium">No articles found</p>
              <p className="text-sm text-muted-foreground">
                Try a different word, or browse all topics.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ArticleList articles={visible} />
        )}

        {visibleCount < filtered.length ? (
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                setPage({ key: filterKey, count: visibleCount + PAGE_SIZE })
              }
            >
              Show more
              <span className="text-muted-foreground tabular-nums">
                ({filtered.length - visibleCount})
              </span>
              <ChevronDown data-icon="inline-end" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-8 sm:px-3",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {label !== "All topics" ? (
        <CategoryDot category={label} className={active ? "opacity-90" : undefined} />
      ) : null}
      {label}
      <span
        className={cn(
          "text-xs tabular-nums",
          active ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function resultLabel(
  count: number,
  categoryName: string | undefined,
  query: string,
  isFiltered: boolean,
) {
  if (!isFiltered) return "Earlier articles, newest first";
  const noun = count === 1 ? "article" : "articles";
  if (query && categoryName) return `${count} ${noun} in ${categoryName} matching “${query}”`;
  if (query) return `${count} ${noun} matching “${query}”`;
  return `${count} ${noun} in ${categoryName}`;
}
