import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { AuthorisationCard } from "@/components/flight/authorisation-card";
import { CurrencyAlert } from "@/components/flight/currency-alert";
import { Button } from "@/components/flight/ui/button";
import { Page, PageHeader, SectionHeading } from "@/components/portal/page";
import { requireUser } from "@/lib/flight/auth";
import { getMyAuthorisations } from "@/lib/flight/queries";

export const metadata = { title: "My flights" };

export default async function MyFlightsPage() {
  const user = await requireUser();
  const authorisations = await getMyAuthorisations(user.id);

  const active = authorisations.filter((a) =>
    ["submitted", "pending", "approved"].includes(a.status),
  );
  const past = authorisations.filter((a) => !active.includes(a));
  const isEmpty = authorisations.length === 0;

  return (
    <Page width="default">
      <PageHeader
        title="My flights"
        description={
          isEmpty
            ? "Authorisations you submit while signed in are listed here."
            : `${active.length} open · ${past.length} past`
        }
        actions={
          <Button asChild>
            <Link href="/authorise">
              <Plus data-icon="inline-start" />
              Authorise a flight
            </Link>
          </Button>
        }
      />

      <CurrencyAlert pilot={user.pilot} />

      {isEmpty ? (
        <section className="flex flex-col items-start gap-4 rounded-xl border border-dashed px-5 py-10 sm:px-8">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold">No flights yet</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Submit an authorisation before your next flight. Your instructor is notified as soon
              as you sign, and the decision shows up here.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/authorise">
              Start an authorisation
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <section aria-labelledby="active-heading" className="flex flex-col gap-3">
            <SectionHeading
              title={<span id="active-heading">Open</span>}
              description="Waiting for review, or approved and ready to fly."
            />
            {active.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Nothing open right now.
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                {active.map((a) => (
                  <li key={a.id}>
                    <AuthorisationCard authorisation={a} href={`/a/${a.access_token}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 ? (
            <section aria-labelledby="history-heading" className="flex flex-col gap-3">
              <SectionHeading
                title={<span id="history-heading">History</span>}
                action={
                  <span className="text-xs text-muted-foreground tabular-nums">{past.length}</span>
                }
              />
              <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                {past.map((a) => (
                  <li key={a.id}>
                    <AuthorisationCard authorisation={a} href={`/a/${a.access_token}`} compact />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Page>
  );
}
