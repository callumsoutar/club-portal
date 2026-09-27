import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/flight/auth-form";
import { AuthShell } from "@/components/flight/auth-shell";
import { Skeleton } from "@/components/flight/ui/skeleton";
import { isMemberLoginEnabled } from "@/lib/flight/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  const memberLoginEnabled = await isMemberLoginEnabled();

  if (!memberLoginEnabled) {
    redirect("/");
  }

  return (
    <AuthShell>
      <Suspense fallback={<FormSkeleton />}>
        <AuthForm mode="signup" memberLoginEnabled={memberLoginEnabled} />
      </Suspense>
    </AuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-8 w-56" />
      <Skeleton className="mx-auto h-4 w-64" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
