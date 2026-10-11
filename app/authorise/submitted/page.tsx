import { SubmittedView } from "@/components/flight/submitted-view";
import { getSessionUser } from "@/lib/flight/auth";
import { isMemberLoginEnabled } from "@/lib/flight/queries";
import { getCompanySettings } from "@/lib/get-company-settings";

export const metadata = { title: "Submitted" };

export default async function SubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; token?: string }>;
}) {
  const { ref, token } = await searchParams;
  const [user, memberLoginEnabled, company] = await Promise.all([
    getSessionUser(),
    isMemberLoginEnabled(),
    getCompanySettings(),
  ]);

  return (
    <SubmittedView
      reference={ref}
      token={token}
      signedIn={Boolean(user)}
      memberLoginEnabled={memberLoginEnabled}
      companyName={company.companyName}
      clubLogoUrl={company.logoUrl}
    />
  );
}
