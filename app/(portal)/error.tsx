"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/flight/ui/button";
import { Page } from "@/components/portal/page";

/**
 * Page-level failure inside the portal shell. The sidebar stays usable, and
 * the underlying error is never shown; the digest lets an admin find it in
 * the server logs.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page width="narrow">
      <div role="alert" className="flex flex-col items-start gap-5 rounded-xl border bg-card p-6 shadow-xs sm:p-8">
        <span className="flex size-10 items-center justify-center rounded-lg bg-danger-muted text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">This page couldn&apos;t load</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Something went wrong on our side. Try again, and if it keeps happening let a club
            admin know{error.digest ? " and quote the reference below" : ""}.
          </p>
          {error.digest ? (
            <p className="pt-1 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </Page>
  );
}
