import Link from "next/link";
import { ArrowRight, MapPinned, Route } from "lucide-react";

import type { FormTemplate } from "@/lib/flight/types";
import { cn } from "@/lib/utils";

type PublishedTemplate = Omit<FormTemplate, "sections">;

function formVisual(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("cross") || lower.includes("xc")) {
    return {
      icon: Route,
      accent: "bg-sky-500/10 text-sky-700 group-hover:bg-sky-600 group-hover:text-white",
    };
  }
  return {
    icon: MapPinned,
    accent:
      "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  };
}

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
          Authorise a flight
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Choose the form that matches your planned flight.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => {
          const visual = formVisual(template.name);
          const Icon = visual.icon;

          return (
            <Link
              key={template.id}
              href={`/authorise/${template.id}`}
              className="group relative flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-2xl transition-colors",
                  visual.accent,
                )}
              >
                <Icon className="size-7" strokeWidth={1.75} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {template.name.replace(/ Flight Authorisation$/i, "")}
                </h2>
                {template.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Version {template.version}
                  </p>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                Continue
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
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
