import Link from "next/link";

import { AuthorisationCard } from "@/components/flight/authorisation-card";
import { CurrencyAlert } from "@/components/flight/currency-alert";
import { Button } from "@/components/flight/ui/button";
import { HomeHero, type HeroAction } from "@/components/portal/home-hero";
import {
  AuthorisationSteps,
  CurrencyList,
  HomeSection,
  QuickLinks,
  SafetyFeed,
  TopicList,
  type QuickLink,
} from "@/components/portal/home-panels";
import { Page, TextLink } from "@/components/portal/page";
import { hasRole } from "@/lib/flight/auth";
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
const CLUB_TIME_ZONE = "Pacific/Auckland";

export default async function PortalHomePage() {
  const viewer = await getPortalViewer();
  const { session, role, company } = viewer;
  const isStaff = role !== null && hasRole(role, "instructor");
  const isMember = session !== null && role !== null;

  const [messages, myAuthorisations, reviewQueue] = await Promise.all([
    getPublishedSafetyMessages(),
    isMember ? getMyAuthorisations(session.id) : Promise.resolve([]),
    isStaff
      ? getAuthorisationQueue({ status: ACTIONABLE_STATUSES, limit: REVIEW_LIMIT })
      : Promise.resolve(null),
  ]);

  const now = new Date();
  const today = clubDateIso(now);
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
  const firstName = session?.profile.full_name?.trim().split(/\s+/)[0];
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

  const access = { role, safetyAdmin: viewer.safetyAdmin };
  const heroHrefs = new Set(
    ["/", AUTHORISE_NAV.href, secondaryAction?.href].filter((href): href is string => Boolean(href)),
  );
  const quickLinks: QuickLink[] = [
    ...APP_NAV.filter((item) => !heroHrefs.has(item.href) && canAccessNav(item, access)),
    ...(isMember ? [PROFILE_NAV] : []),
  ];

  return (
    <Page width="wide" className="gap-8">
      <HomeHero
        eyebrow={new Intl.DateTimeFormat("en-NZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: CLUB_TIME_ZONE,
        }).format(now)}
        title={
          viewer.user
            ? `${greeting(now)}${firstName ? `, ${firstName}` : ""}`
            : `Welcome to ${company.companyName}`
        }
        description={
          viewer.user
            ? "Authorise a flight, keep an eye on your currency and catch up on the latest safety messages."
            : "Authorise your flight before you go, and keep up with the club's safety messages. You don't need an account for either."
        }
        primary={{ href: AUTHORISE_NAV.href, label: AUTHORISE_NAV.title, icon: AUTHORISE_NAV.icon }}
        secondary={secondaryAction}
      />

      {session ? <CurrencyAlert pilot={session.pilot} /> : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {reviewQueue ? (
            <ReviewSection queue={reviewQueue} countLabel={reviewCountLabel} />
          ) : null}

          {isMember ? <MyFlightsSection flights={openFlights} /> : null}

          <HomeSection
            id="safety-heading"
            title="Latest from the Safety Hub"
            action={articles.length > 0 ? <TextLink href="/safety">All articles</TextLink> : null}
            framed
          >
            {featured ? (
              <SafetyFeed featured={featured} rest={moreArticles} isNew={isNew} />
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Safety articles will appear here once the safety team publishes them.
              </p>
            )}
          </HomeSection>
        </div>

        <aside className="flex min-w-0 flex-col gap-10" aria-label="More">
          {viewer.user ? (
            quickLinks.length > 0 ? (
              <HomeSection id="links-heading" title="Quick links">
                <QuickLinks links={quickLinks} />
              </HomeSection>
            ) : null
          ) : (
            <HomeSection id="how-heading" title="How flight authorisation works">
              <AuthorisationSteps />
            </HomeSection>
          )}

          {session ? (
            <HomeSection
              id="currency-heading"
              title="Your currency"
              action={<TextLink href={PROFILE_NAV.href}>Update</TextLink>}
            >
              <CurrencyList pilot={session.pilot} />
            </HomeSection>
          ) : null}

          {topics.length > 0 ? (
            <HomeSection id="topics-heading" title="Safety topics">
              <TopicList topics={topics} />
            </HomeSection>
          ) : null}

          {!viewer.user && viewer.memberLoginEnabled ? <MemberPrompt /> : null}
        </aside>
      </div>
    </Page>
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
    <HomeSection
      id="review-heading"
      title="Waiting for your review"
      description={
        count === 0
          ? "Nothing waiting. New submissions show here as pilots send them."
          : `${countLabel} ${count === 1 ? "authorisation needs" : "authorisations need"} an instructor decision`
      }
      action={<TextLink href="/fly/instructor">Review queue</TextLink>}
      framed={count > 0}
    >
      {count > 0 ? (
        <ul className="divide-y divide-border/70">
          {queue.slice(0, 4).map((a) => (
            <li key={a.id}>
              <AuthorisationCard
                authorisation={a}
                href={`/fly/instructor/authorisations/${a.id}`}
                showPilot
              />
            </li>
          ))}
        </ul>
      ) : null}
    </HomeSection>
  );
}

function MyFlightsSection({ flights }: { flights: AuthorisationWithRelations[] }) {
  return (
    <HomeSection
      id="my-flights-heading"
      title="Your open authorisations"
      description={
        flights.length === 0
          ? "Flights you submit show here until they're done."
          : undefined
      }
      action={<TextLink href="/fly">My flights</TextLink>}
      framed={flights.length > 0}
    >
      {flights.length > 0 ? (
        <ul className="divide-y divide-border/70">
          {flights.slice(0, 3).map((a) => (
            <li key={a.id}>
              <AuthorisationCard authorisation={a} href={`/a/${a.access_token}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </HomeSection>
  );
}

function MemberPrompt() {
  return (
    <section aria-labelledby="member-heading" className="rounded-xl bg-muted/60 p-5">
      <h2 id="member-heading" className="text-sm font-semibold">
        Club member?
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Sign in to keep a history of your flights, track your BFR and medical, and have your
        details filled in for you next time.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/signup">Create an account</Link>
        </Button>
      </div>
    </section>
  );
}

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-NZ", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: CLUB_TIME_ZONE,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Today's date at the club as `YYYY-MM-DD`. */
function clubDateIso(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TIME_ZONE }).format(now);
}

function daysBetween(fromIso: string, toIso: string) {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}
