import Link from "next/link";
import { ArrowRight, MapPinned, Route } from "lucide-react";

import { SaveDetailsPrompt } from "@/components/flight/save-details-prompt";
import type { FormTemplate } from "@/lib/flight/types";

type PublishedTemplate = Omit<FormTemplate, "sections">;

function formIcon(name: string) {
  const lower = name.toLowerCase();
  return lower.includes("cross") || lower.includes("xc") ? Route : MapPinned;
}

const STEPS = [
  {
    title: "Choose the form for your flight",
    body: "Each form asks only what's relevant to that type of flight.",
  },
  {
    title: "Work through each section",
    body: "Required fields are checked as you go, and your progress is saved on this device if you get interrupted.",
  },
  {
    title: "Sign and submit",
    body: "Your answers and signature are sent to an instructor for review. You get a reference and a link to track the decision.",
  },
];

/**
 * Pilots pick which authorisation to start when more than one form is
 * published. Rendered inside the portal shell; the form itself is full screen.
 */
export function FormPicker({
  templates,
  offerAccount = false,
}: {
  templates: PublishedTemplate[];
  /** Guests can create an account before they pick a form. */
  offerAccount?: boolean;
}) {
  return (
    <>
      <ul aria-label="Authorisation forms" className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = formIcon(template.name);
          const name = template.name.replace(/ Flight Authorisation$/i, "");
          return (
            <li key={template.id} className="flex">
              <Link
                href={`/authorise/${template.id}`}
                className="group flex w-full flex-col rounded-xl border bg-card p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="mt-5 block text-lg font-semibold tracking-[-0.015em] text-foreground">
                  {name}
                </span>
                <span className="mt-1 block flex-1 text-sm leading-relaxed text-muted-foreground">
                  {template.description || template.name}
                </span>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Start {name.toLowerCase()} authorisation
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {offerAccount ? <SaveDetailsPrompt nextPath="/authorise" /> : null}

      <section aria-labelledby="how-it-works" className="border-t pt-8">
        <h2 id="how-it-works" className="text-sm font-semibold text-foreground">
          How it works
        </h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="w-4 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block text-sm font-medium text-foreground">{step.title}</span>
                <span className="block text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
