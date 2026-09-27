"use client";

import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { motion } from "framer-motion";

import { SuccessAnimation } from "@/components/flight/success-animation";
import { CopyLinkButton } from "@/components/flight/copy-link-button";
import { Logo } from "@/components/flight/logo";
import { Button } from "@/components/flight/ui/button";

interface SubmittedViewProps {
  reference?: string;
  token?: string;
  signedIn: boolean;
  memberLoginEnabled?: boolean;
}

/**
 * Post-submit confirmation — one job: reassure, then get the pilot to
 * their tracking link (or home) without visual noise.
 */
export function SubmittedView({
  reference,
  token,
  signedIn,
  memberLoginEnabled = true,
}: SubmittedViewProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Soft success wash — atmosphere without competing with the mark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55rem_28rem_at_50%_-8%,color-mix(in_oklch,var(--success)_18%,transparent),transparent_68%),radial-gradient(36rem_22rem_at_90%_10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%),radial-gradient(28rem_20rem_at_10%_90%,color-mix(in_oklch,var(--info)_8%,transparent),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <motion.div
          className="flex justify-center pt-2 sm:pt-4"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          <Logo className="opacity-90" />
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          <motion.div
            className="flex flex-col items-center text-center"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.92 },
                show: {
                  opacity: 1,
                  scale: 1,
                  transition: { type: "spring", stiffness: 280, damping: 20 },
                },
              }}
            >
              <SuccessAnimation />
            </motion.div>

            <motion.h1
              className="mt-7 text-[1.85rem] leading-tight font-semibold tracking-tight text-balance text-foreground sm:text-[2.1rem]"
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                },
              }}
            >
              Sent to your instructor
            </motion.h1>

            <motion.p
              className="mt-3 max-w-[20rem] text-[15px] leading-relaxed text-foreground/65 text-pretty sm:max-w-sm"
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                },
              }}
            >
              Locked and waiting for approval. Most are actioned within a few
              minutes.
            </motion.p>

            {reference && (
              <motion.div
                className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-foreground/10 bg-card px-4 py-2 shadow-soft"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
                  },
                }}
              >
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Ref
                </span>
                <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                  {reference}
                </span>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            className="mt-10 space-y-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.35,
              duration: 0.45,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            {token && (
              <>
                <Button
                  asChild
                  size="lg"
                  className="h-14 w-full gap-2 rounded-2xl text-[15px] font-semibold shadow-lift"
                >
                  <Link href={`/a/${token}`}>
                    Track this authorisation
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <CopyLinkButton
                  path={`/a/${token}`}
                  label="Share tracking link"
                  copiedLabel="Link ready"
                  icon={<Share2 className="size-4" />}
                  className="h-12 w-full gap-2 rounded-2xl border-border bg-card text-[15px] font-medium"
                />
              </>
            )}

            <div className="pt-1 text-center">
              <Link
                href={signedIn ? "/fly" : "/"}
                className="inline-flex h-11 items-center justify-center px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {signedIn ? "Back to my flights" : "Done"}
              </Link>
            </div>
          </motion.div>
        </div>

        {!signedIn && memberLoginEnabled && (
          <motion.p
            className="pb-2 text-center text-[13px] leading-relaxed text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            Next time, skip the details.{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Create an account
            </Link>
          </motion.p>
        )}
      </div>
    </div>
  );
}
