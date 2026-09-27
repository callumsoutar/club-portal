import 'server-only'

import { cache } from 'react'

import {
  brandingBucket,
  defaultCompanyName,
  isCompanyLogoPath,
  type CompanySettings,
} from '@/lib/company-settings'
import { createClient } from '@/lib/supabase/server'

const fallbackSettings: CompanySettings = {
  companyName: defaultCompanyName,
  logoUrl: null,
}

export const getCompanySettings = cache(async (): Promise<CompanySettings> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('company_settings')
      .select('company_name, logo_path')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) return fallbackSettings

    const row = data as { company_name: string; logo_path: string | null }
    const companyName = row.company_name.trim() || defaultCompanyName
    const logoPath = row.logo_path && isCompanyLogoPath(row.logo_path) ? row.logo_path : null
    const logoUrl = logoPath
      ? supabase.storage.from(brandingBucket).getPublicUrl(logoPath).data.publicUrl
      : null

    return { companyName, logoUrl }
  } catch {
    return fallbackSettings
  }
})
