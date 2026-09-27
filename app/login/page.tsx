import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Logo } from '@/components/logo'
import { LoginForm } from '@/components/login-form'
import { getAdminUser, safeNextPath } from '@/lib/auth'
import { getCompanySettings } from '@/lib/get-company-settings'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const [admin, company] = await Promise.all([getAdminUser(), getCompanySettings()])
  const { next } = await searchParams
  const nextPath = safeNextPath(next)
  if (admin) redirect(nextPath)

  return (
    <main className="login-page">
      <section className="login-copy">
        <Link className="back-link" href="/">
          <ChevronLeft size={16} /> Back to latest
        </Link>
        <Link href="/" aria-label={`${company.companyName} home`}>
          <Logo companyName={company.companyName} logoUrl={company.logoUrl} />
        </Link>
        <p className="eyebrow">Admin</p>
        <h1>Sign in</h1>
        <p className="login-lede">
          Edit and publish safety messages. Club members can read everything on the site without an account.
        </p>
        <LoginForm nextPath={nextPath} />
      </section>
      <aside className="login-aside" aria-hidden="true">
        <p>Safety is a shared responsibility.</p>
      </aside>
    </main>
  )
}
