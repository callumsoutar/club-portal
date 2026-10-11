import Link from "next/link";

import { Button } from "@/components/flight/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-5 px-6">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button asChild>
          <Link href="/">Go to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/safety">Safety Hub</Link>
        </Button>
      </div>
    </main>
  );
}
