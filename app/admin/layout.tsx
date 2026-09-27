import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminNav } from '@/components/admin-nav'
import { Logo } from '@/components/logo'
import { signOut } from '@/app/admin/actions'
import { getAdminUser } from '@/lib/auth'
import { getCompanySettings } from '@/lib/get-company-settings'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [admin, company] = await Promise.all([getAdminUser(), getCompanySettings()])
  if (!admin) redirect('/login?next=/admin')

  return (
    <div className="admin-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" aria-label={`${company.companyName} home`}><Logo companyName={company.companyName} logoUrl={company.logoUrl} /></Link>
          <AdminNav />
          <form action={signOut}>
            <button className="admin-text" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
