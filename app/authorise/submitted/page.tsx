import { SubmittedView } from "@/components/flight/submitted-view";
import { getSessionUser } from "@/lib/flight/auth";
import { isMemberLoginEnabled } from "@/lib/flight/queries";

export const metadata = { title: "Submitted" };

export default async function SubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; token?: string }>;
}) {
  const { ref, token } = await searchParams;
  const [user, memberLoginEnabled] = await Promise.all([
    getSessionUser(),
    isMemberLoginEnabled(),
  ]);

  return (
    <SubmittedView
      reference={ref}
      token={token}
      signedIn={Boolean(user)}
      memberLoginEnabled={memberLoginEnabled}
    />
  );
}
