"use client";

import { toast } from "sonner";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

/**
 * Guest nudge on the authorisation flow. Google sign-in returns to `nextPath`,
 * and a later submit stores the personal details for the next flight.
 */
export function SaveDetailsPrompt({
  nextPath,
  onBeforeSignIn,
}: {
  nextPath: string;
  onBeforeSignIn?: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Want this faster next time?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in with Google and we&apos;ll save your name, phone, and licence
          details, so your next form fills itself in.
        </p>
      </div>
      <div className="shrink-0">
        <GoogleSignInButton
          nextPath={nextPath}
          label="Continue with Google"
          onBeforeSignIn={onBeforeSignIn}
          onError={(message) => toast.error(message)}
        />
      </div>
    </section>
  );
}
