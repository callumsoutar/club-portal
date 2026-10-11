import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, PencilLine } from "lucide-react";

import { MessageBody } from "@/components/message-body";
import { Button } from "@/components/flight/ui/button";
import { Page, SectionHeading, TextLink } from "@/components/portal/page";
import { ArticleList, CategoryDot } from "@/components/safety/article-row";
import {
  getPublishedSafetyMessage,
  getPublishedSafetyMessages,
} from "@/lib/get-published-safety-messages";
import { getPortalViewer } from "@/lib/portal/viewer";
import {
  safetyArticleHref,
  safetyCategoryHref,
  toArticleSummary,
  type SafetyMessage,
} from "@/lib/safety-messages";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const message = await getPublishedSafetyMessage(slug);
  if (!message) return { title: "Article not found" };
  return {
    title: message.title,
    description: message.description,
  };
}

export default async function SafetyArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const [messages, viewer] = await Promise.all([
    getPublishedSafetyMessages(),
    getPortalViewer(),
  ]);

  const index = messages.findIndex((item) => item.slug === slug);
  const message = messages[index];
  if (!message) notFound();

  const newer = index > 0 ? messages[index - 1] : undefined;
  const older = messages[index + 1];
  const related = messages
    .filter((item) => item.category === message.category && item.slug !== message.slug)
    .slice(0, 3)
    .map(toArticleSummary);

  return (
    <Page width="narrow" className="gap-10">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/safety"
              className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Safety Hub
            </Link>
            {viewer.safetyAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/messages/${message.databaseId}`}>
                  <PencilLine data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={safetyCategoryHref(message.category)}
              className="inline-flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-foreground/80 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CategoryDot category={message.category} className="size-2" />
              {message.category}
            </Link>
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.03em] text-balance sm:text-[2.25rem]">
              {message.title}
            </h1>
            {message.description ? (
              <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
                {message.description}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {message.date ? <time>{message.date}</time> : null}
              {message.date ? <span aria-hidden> · </span> : null}
              {message.read}
              <span aria-hidden> · </span>
              {viewer.company.companyName} safety team
            </p>
          </div>
        </header>

        {message.imageUrl ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt={message.imageAlt}
              className="w-full rounded-xl bg-muted object-cover"
            />
            {message.caption ? (
              <figcaption className="text-sm text-muted-foreground">{message.caption}</figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="article-copy">
          <MessageBody markdown={message.body} />
        </div>

        {message.links.length > 0 ? <FurtherReading links={message.links} /> : null}
      </article>

      {newer || older ? <ArticlePager newer={newer} older={older} /> : null}

      {related.length > 0 ? (
        <section className="flex flex-col gap-2 border-t pt-8">
          <SectionHeading
            title={`More on ${message.category}`}
            action={
              <TextLink href={safetyCategoryHref(message.category)}>
                View all
                <ArrowRight className="size-3.5" aria-hidden />
              </TextLink>
            }
          />
          <ArticleList articles={related} showSummary={false} />
        </section>
      ) : null}
    </Page>
  );
}

function FurtherReading({ links }: { links: SafetyMessage["links"] }) {
  return (
    <section aria-labelledby="further-reading" className="flex flex-col gap-3">
      <h2 id="further-reading" className="text-[15px] font-semibold">
        Further reading
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
            >
              <span className="min-w-0">
                {link.label}
                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                  {hostname(link.url)}
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticlePager({ newer, older }: { newer?: SafetyMessage; older?: SafetyMessage }) {
  return (
    <nav aria-label="More articles" className="grid gap-3 sm:grid-cols-2">
      {older ? (
        <PagerLink message={older} direction="older" />
      ) : (
        <span className="hidden sm:block" />
      )}
      {newer ? <PagerLink message={newer} direction="newer" /> : null}
    </nav>
  );
}

function PagerLink({ message, direction }: { message: SafetyMessage; direction: "older" | "newer" }) {
  const isNewer = direction === "newer";
  return (
    <Link
      href={safetyArticleHref(message.slug)}
      className={`group flex flex-col gap-1 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${isNewer ? "sm:items-end sm:text-right" : ""}`}
    >
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {isNewer ? null : <ArrowLeft className="size-3.5" aria-hidden />}
        {isNewer ? "Newer" : "Older"}
        {isNewer ? <ArrowRight className="size-3.5" aria-hidden /> : null}
      </span>
      <span className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
        {message.title}
      </span>
    </Link>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
