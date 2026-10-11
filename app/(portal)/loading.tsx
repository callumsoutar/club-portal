import { Skeleton } from "@/components/flight/ui/skeleton";
import { Page } from "@/components/portal/page";

export default function PortalLoading() {
  return (
    <Page>
      <span className="sr-only" role="status">
        Loading…
      </span>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full max-w-lg" />
          </div>
        ))}
      </div>
    </Page>
  );
}
