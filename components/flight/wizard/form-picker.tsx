import Link from "next/link";
import { ArrowRight, MapPinned, Route } from "lucide-react";

import { SaveDetailsPrompt } from "@/components/flight/save-details-prompt";
import type { FormTemplate } from "@/lib/flight/types";

type PublishedTemplate = Omit<FormTemplate, "sections">;

function formIcon(name: string) {
  const lower = name.toLowerCase();
  return lower.includes("cross") || lower.includes("xc") ? Route : MapPinned;
}

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
    </>
  );
}
