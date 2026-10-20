import Link from "next/link";

import { AuthorisationCard } from "@/components/flight/authorisation-card";
import { CurrencyAlert } from "@/components/flight/currency-alert";
import { HomeHeader, type HeroAction } from "@/components/portal/home-hero";
import {
  QuickLinks,
  RecordList,
  ReminderList,
  SafetyFeed,
  Section,
  SectionEmpty,
  TopicPills,
  type QuickLink,
} from "@/components/portal/home-panels";
import { Page } from "@/components/portal/page";
import { ACTIONABLE_STATUSES } from "@/lib/flight/constants";
import { APP_NAV, AUTHORISE_NAV, canAccessNav, PROFILE_NAV } from "@/lib/flight/nav";
import { getAuthorisationQueue, getMyAuthorisations } from "@/lib/flight/queries";
import type { AuthorisationWithRelations } from "@/lib/flight/types";
import { getPublishedSafetyMessages } from "@/lib/get-published-safety-messages";
import { getPortalViewer } from "@/lib/portal/viewer";
import {
  safetyMessageCategories,
  toArticleSummary,
  type SafetyArticleSummary,
} from "@/lib/safety-messages";

const OPEN_STATUSES = new Set(["submitted", "pending", "approved"]);
const REVIEW_LIMIT = 50;
const NEW_ARTICLE_DAYS = 14;

export default async function PortalHomePage() {
  const viewer = await getPortalViewer();
  const { session, role, company } = viewer;
  const isAdmin = role === "admin";
  const isMember = session !== null && role !== null;

  const [messages, myAuthorisations, reviewQueue] = await Promise.all([
    getPublishedSafetyMessages(),
    isMember ? getMyAuthorisations(session.id) : Promise.resolve([]),
    isAdmin
      ? getAuthorisationQueue({ status: ACTIONABLE_STATUSES, limit: REVIEW_LIMIT })
      : Promise.resolve(null),
  ]);

  const now = new Date();
  const today = clubDateIso(now, company.timeZone);
  const isNew = (article: SafetyArticleSummary) =>
    article.publishedOn !== null && daysBetween(article.publishedOn, today) <= NEW_ARTICLE_DAYS;

  const articles = messages.map(toArticleSummary);
  const featuredSlug = messages.find((m) => m.featured)?.slug;
  const featured = articles.find((a) => a.slug === featuredSlug) ?? articles[0];
  const moreArticles = articles.filter((a) => a !== featured).slice(0, 4);

  const topicCounts = new Map<string, number>();
  for (const message of messages) {
    topicCounts.set(message.category, (topicCounts.get(message.category) ?? 0) + 1);
  }
  const topics = safetyMessageCategories
    .filter((name) => topicCounts.has(name))
    .map((name) => ({ name, count: topicCounts.get(name)! }));

  const openFlights = myAuthorisations.filter((a) => OPEN_STATUSES.has(a.status));
  const reviewCount = reviewQueue?.length ?? 0;
  const reviewCountLabel = reviewCount >= REVIEW_LIMIT ? `${REVIEW_LIMIT}+` : String(reviewCount);

  // Signed-in visitors get a second action for the work waiting on them.
  // Guests already have the latest articles on this page, so they only see
  // flight authorisation.
  const flightsNav = APP_NAV.find((item) => item.href === "/fly")!;
  const reviewNav = APP_NAV.find((item) => item.href === "/fly/instructor")!;
  const secondaryAction: HeroAction | undefined = reviewQueue
    ? {
        href: reviewNav.href,
        icon: reviewNav.icon,
        label:
          reviewCount > 0 ? `${reviewNav.title} (${reviewCountLabel})` : reviewNav.title,
      }
    : isMember
      ? { href: flightsNav.href, icon: flightsNav.icon, label: flightsNav.title }
      : undefined;

  // Leave out anything the page already links to prominently.
  const access = { role, safetyAdmin: viewer.safetyAdmin };
  const linkedAbove = new Set(
    ["/", "/safety", AUTHORISE_NAV.href, secondaryAction?.href].filter(
      (href): href is string => Boolean(href),
    ),
  );
  const quickLinks: QuickLink[] = [
    ...APP_NAV.filter((item) => !linkedAbove.has(item.href) && canAccessNav(item, access)),
    ...(isMember ? [PROFILE_NAV] : []),
  ];

  return (
    <>
      {/* White band for the title; cancels the shell's top padding. */}
      <div className="-mt-8 border-b bg-card md:-mt-10">
        <Page
          width="wide"
          className="max-w-7xl gap-0 pt-8 pb-8 md:pt-10"
        >
          <HomeHeader
            eyebrow={company.companyName}
            title="Home"
            description={
              viewer.user
                ? new Intl.DateTimeFormat("en-NZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: company.timeZone,
                  }).format(now)
                : "Authorise your flight before you go and keep up with the club's safety messages. You don't need an account for either."
            }
            primary={{ href: AUTHORISE_NAV.href, label: AUTHORISE_NAV.title, icon: AUTHORISE_NAV.icon }}
            secondary={secondaryAction}
          />
        </Page>
      </div>

      <div className="-mb-8 flex-1 bg-[oklch(0.976_0.004_255)] md:-mb-10">
        <Page width="wide" className="max-w-7xl gap-8 pt-8 md:pt-10">
          {session ? <CurrencyAlert pilot={session.pilot} timeZone={company.timeZone} /> : null}

          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
            <div className="flex min-w-0 flex-col gap-6">
              {reviewQueue ? (
                <ReviewSection queue={reviewQueue} countLabel={reviewCountLabel} />
              ) : null}

              {isMember ? <MyFlightsSection flights={openFlights} /> : null}

              <Section
                id="safety-heading"
                title="Latest from the Safety Hub"
                action={articles.length > 0 ? { href: "/safety", label: "All articles" } : undefined}
              >
                {featured ? (
                  <SafetyFeed featured={featured} rest={moreArticles} isNew={isNew} />
                ) : (
                  <SectionEmpty>
                    Safety articles will appear here once the safety team publishes them.
                  </SectionEmpty>
                )}
              </Section>
            </div>

            <aside className="flex min-w-0 flex-col gap-10" aria-label="More">
              {session ? (
                <Section
                  id="reminders-heading"
                  title="Personal reminders"
                  variant="aside"
                  action={{ href: PROFILE_NAV.href, label: "Edit" }}
                >
                  <ReminderList pilot={session.pilot} timeZone={company.timeZone} />
                </Section>
              ) : null}

              {viewer.user && quickLinks.length > 0 ? (
                <Section id="links-heading" title="Quick links" variant="aside">
                  <QuickLinks links={quickLinks} />
                </Section>
              ) : null}

              {topics.length > 0 ? (
                <Section id="topics-heading" title="Browse by topic" variant="aside">
                  <TopicPills topics={topics} />
                </Section>
              ) : null}

              {!viewer.user && viewer.memberLoginEnabled ? <MemberPrompt /> : null}
            </aside>
          </div>
        </Page>
      </div>
    </>
  );
}

function ReviewSection({
  queue,
  countLabel,
}: {
  queue: AuthorisationWithRelations[];
  countLabel: string;
}) {
  const count = queue.length;
  return (
    <Section
      id="review-heading"
      title="Waiting for your review"
      meta={count > 0 ? countLabel : undefined}
      action={{ href: "/fly/instructor", label: "Review queue" }}
    >
      {count > 0 ? (
        <RecordList>
          {queue.slice(0, 4).map((a) => (
            <li key={a.id}>
              <AuthorisationCard
                authorisation={a}
                href={`/fly/instructor/authorisations/${a.id}`}
                showPilot
              />
            </li>
          ))}
        </RecordList>
      ) : (
        <SectionEmpty>Nothing waiting. New submissions show here as pilots send them.</SectionEmpty>
      )}
    </Section>
  );
}

function MyFlightsSection({ flights }: { flights: AuthorisationWithRelations[] }) {
  return (
    <Section
      id="my-flights-heading"
      title="Your open authorisations"
      meta={flights.length > 0 ? flights.length : undefined}
      action={{ href: "/fly", label: "My flights" }}
    >
      {flights.length > 0 ? (
        <RecordList>
          {flights.slice(0, 3).map((a) => (
            <li key={a.id}>
              <AuthorisationCard authorisation={a} href={`/a/${a.access_token}`} />
            </li>
          ))}
        </RecordList>
      ) : (
        <SectionEmpty>Flights you submit show here until they&apos;re done.</SectionEmpty>
      )}
    </Section>
  );
}

function MemberPrompt() {
  return (
    <section
      aria-labelledby="member-heading"
      className="rounded-lg bg-sidebar px-5 py-5 text-sidebar-foreground"
    >
      <h2 id="member-heading" className="text-sm font-semibold text-white">
        Club member?
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed">
        Track your BFR and medical, and save your details ready for next time so it&apos;s
        quicker and easier.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Link
          href="/login"
          className="inline-flex h-8 items-center rounded-md bg-white px-3.5 text-sm font-medium text-sidebar transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-sm text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          Create an account
        </Link>
      </div>
    </section>
  );
}

/** Today's date at the club as `YYYY-MM-DD`. */
function clubDateIso(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

function daysBetween(fromIso: string, toIso: string) {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}
