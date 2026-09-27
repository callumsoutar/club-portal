import type { Metadata } from 'next'

import { CompanySettingsForm } from '@/components/company-settings-form'
import { getCompanySettings } from '@/lib/get-company-settings'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function CompanySettingsPage() {
  const settings = await getCompanySettings()

  return (
    <main className="admin-page">
      <p className="eyebrow">Club</p>
      <h1>Settings</h1>
      <CompanySettingsForm key={`${settings.companyName}:${settings.logoUrl ?? ''}`} companyName={settings.companyName} logoUrl={settings.logoUrl} />
    </main>
  )
}
