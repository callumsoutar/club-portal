import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/flight/auth-shell'
import { LoginForm } from '@/components/login-form'
import { getAdminUser, landingPath, safeNextPath } from '@/lib/auth'
import { getSessionUser } from '@/lib/flight/auth'
import { isMemberLoginEnabled } from '@/lib/flight/queries'
import { getCompanySettings } from '@/lib/get-company-settings'
import { signInErrorFromQuery } from '@/lib/sign-in-errors'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const [admin, session, company, memberLoginEnabled] = await Promise.all([
    getAdminUser(),
    getSessionUser(),
    getCompanySettings(),
    isMemberLoginEnabled(),
  ])
  const { next, error } = await searchParams
  const nextPath = safeNextPath(next)
  if (admin || session) {
    const destination = landingPath({
      nextPath,
      safetyAdmin: admin !== null,
      flightRole: session?.profile.role ?? null,
    })
    if (destination) redirect(destination)
  }

  return (
    <AuthShell>
      <LoginForm
        nextPath={nextPath ?? ''}
        initialError={signInErrorFromQuery(error)}
        companyName={company.companyName}
        memberLoginEnabled={memberLoginEnabled}
      />
    </AuthShell>
  )
}
