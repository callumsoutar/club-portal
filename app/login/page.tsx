import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Logo } from '@/components/logo'
import { LoginForm } from '@/components/login-form'
import { getAdminUser, landingPath, safeNextPath } from '@/lib/auth'
import { signInErrorFromQuery } from '@/lib/sign-in-errors'
import { getSessionUser } from '@/lib/flight/auth'
import { getCompanySettings } from '@/lib/get-company-settings'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const [admin, session, company] = await Promise.all([
    getAdminUser(),
    getSessionUser(),
    getCompanySettings(),
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
    <main className="login-page">
      <section className="login-copy">
        <Link className="back-link" href="/">
          <ChevronLeft size={16} /> Back to latest
        </Link>
        <Link href="/" aria-label={`${company.companyName} home`}>
          <Logo companyName={company.companyName} logoUrl={company.logoUrl} />
        </Link>
        <p className="eyebrow">Safety Hub</p>
        <h1>Sign in</h1>
        <p className="login-lede">
          One account for safety messages and flight authorisations. The public site stays open without signing in.
        </p>
        <LoginForm nextPath={nextPath ?? ''} initialError={signInErrorFromQuery(error)} />
        <p className="login-lede">
          <Link href="/signup">Create an account</Link>
          {' · '}
          <Link href="/authorise">Authorise a flight without an account</Link>
        </p>
      </section>
      <aside className="login-aside" aria-hidden="true">
        <p>Safety is a shared responsibility.</p>
      </aside>
    </main>
  )
}
