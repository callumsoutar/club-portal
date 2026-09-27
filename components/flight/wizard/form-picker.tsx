import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";

import type { FormTemplate } from "@/lib/flight/types";

type PublishedTemplate = Omit<FormTemplate, "sections">;

/**
 * When more than one form is published, pilots pick which authorisation to start.
 */
export function FormPicker({
  templates,
  cancelHref,
}: {
  templates: PublishedTemplate[];
  cancelHref: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Select a form
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Choose the authorisation form that matches your planned flight.
        </p>
      </header>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/authorise/${template.id}`}
            className="group relative flex items-start gap-5 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm sm:items-center sm:p-6"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <FileSignature className="size-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                {template.name}
              </h2>
              {template.description ? (
                <p className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {template.description}
                </p>
              ) : (
                <p className="mt-1 block text-xs text-muted-foreground">
                  Version {template.version}
                </p>
              )}
            </div>
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary sm:flex">
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href={cancelHref}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel and return
        </Link>
      </div>
    </div>
  );
}
