import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Tv } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { Page, PageHeader } from "@/components/portal/page";
import { ArticleMeta } from "@/components/safety/article-row";
import { SafetyHubBrowser, type HubCategory } from "@/components/safety/safety-hub-browser";
import { getPublishedSafetyMessages } from "@/lib/get-published-safety-messages";
import { getPortalViewer } from "@/lib/portal/viewer";
import {
  categoryFromSlug,
  categorySlug,
  safetyArticleHref,
  safetyMessageCategories,
  toArticleSummary,
  type SafetyMessage,
} from "@/lib/safety-messages";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Safety Hub",
};

export default async function SafetyHubPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const [{ category, q }, messages, viewer] = await Promise.all([
    searchParams,
    getPublishedSafetyMessages(),
    getPortalViewer(),
  ]);

  const counts = new Map<string, number>();
  for (const message of messages) {
    counts.set(message.category, (counts.get(message.category) ?? 0) + 1);
  }
  const categories: HubCategory[] = safetyMessageCategories
    .filter((name) => counts.has(name))
    .map((name) => ({ name, slug: categorySlug(name), count: counts.get(name)! }));

  const initialCategory = categoryFromSlug(category) ? category! : null;
  const latest = messages[0];

  return (
    <Page>
      <PageHeader
        title="Safety Hub"
        description={`Safety messages and practical flying reminders from the ${viewer.company.companyName} safety team.`}
        actions={
          viewer.safetyAdmin ? (
            <>
              <Button asChild variant="outline">
                <Link href="/tv">
                  <Tv data-icon="inline-start" />
                  Briefing room TV
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/messages/new">
                  <Plus data-icon="inline-start" />
                  New article
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-sm font-medium">No articles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Safety articles will appear here once the safety team publishes them.
          </p>
        </div>
      ) : (
        <>
          {latest ? <LatestArticle message={latest} /> : null}
          <SafetyHubBrowser
            articles={messages.map(toArticleSummary)}
            categories={categories}
            initialCategory={initialCategory}
            initialQuery={q?.slice(0, 100) ?? ""}
            excludeSlug={latest?.slug}
          />
        </>
      )}
    </Page>
  );
}

function LatestArticle({ message }: { message: SafetyMessage }) {
  return (
    <section aria-labelledby="latest-heading">
      <Link
        href={safetyArticleHref(message.slug)}
        className={cn(
          "group grid gap-5 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-6",
          message.imageUrl && "md:grid-cols-[minmax(0,1fr)_14rem] md:items-center",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Latest
          </p>
          <h2
            id="latest-heading"
            className="mt-2 text-xl leading-snug font-semibold tracking-[-0.02em] text-pretty group-hover:text-primary sm:text-[1.375rem]"
          >
            {message.title}
          </h2>
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">
            {message.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <ArticleMeta article={message} />
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read article
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
        {message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt={message.imageAlt}
            className="order-first aspect-[16/9] w-full rounded-lg bg-muted object-cover md:order-none md:aspect-[4/3]"
          />
        ) : null}
      </Link>
    </section>
  );
}
