"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { CopyLinkButton } from "@/components/flight/copy-link-button";
import { Logo } from "@/components/flight/logo";
import { Button } from "@/components/flight/ui/button";

interface SubmittedViewProps {
  reference?: string;
  token?: string;
  signedIn: boolean;
  memberLoginEnabled?: boolean;
  companyName: string;
  clubLogoUrl: string | null;
}

/**
 * Post-submit confirmation — confirm receipt, show the reference, then
 * get the pilot onto tracking without celebration chrome.
 */
export function SubmittedView({
  reference,
  token,
  signedIn,
  memberLoginEnabled = true,
  companyName,
  clubLogoUrl,
}: SubmittedViewProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <motion.div
          className="flex items-center justify-between gap-4 border-b border-border/70 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Link href="/" aria-label={`${companyName} home`} className="min-w-0">
            <Logo companyName={companyName} clubLogoUrl={clubLogoUrl} />
          </Link>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Submitted
          </span>
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-[13px] font-medium text-primary">
              Waiting for instructor approval
            </p>

            <h1 className="mt-3 max-w-[16ch] text-[2rem] leading-[1.1] font-semibold tracking-[-0.035em] text-foreground sm:text-[2.35rem]">
              Sent to your instructor
            </h1>

            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Your authorisation is locked. You’ll be notified when it’s approved
              or if anything needs changing.
            </p>

            {reference && (
              <div className="mt-8 border border-border bg-muted/30 px-4 py-3.5">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Reference
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-foreground">
                  {reference}
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            className="mt-10 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {token && (
              <>
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full gap-2 rounded-lg text-[15px] font-semibold"
                >
                  <Link href={`/a/${token}`}>
                    Track this authorisation
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <CopyLinkButton
                  path={`/a/${token}`}
                  label="Copy tracking link"
                  copiedLabel="Copied"
                  className="h-11 w-full rounded-lg border-border bg-transparent text-[15px] font-medium"
                />
              </>
            )}

            <div className="pt-2 text-center">
              <Link
                href={signedIn ? "/fly" : "/"}
                className="text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                {signedIn ? "Go to my flights" : "Back to home"}
              </Link>
            </div>
          </motion.div>
        </div>

        {!signedIn && memberLoginEnabled && (
          <p className="border-t border-border/70 pt-4 pb-1 text-center text-[13px] leading-relaxed text-muted-foreground">
            Next time, skip the details.{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
