import 'server-only'

import { cache } from 'react'

import {
  brandingBucket,
  defaultCompanyName,
  isCompanyLogoPath,
  type CompanySettings,
} from '@/lib/company-settings'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_TIME_ZONE, resolveTimeZone } from '@/lib/time-zone'

const fallbackSettings: CompanySettings = {
  companyName: defaultCompanyName,
  logoUrl: null,
  timeZone: DEFAULT_TIME_ZONE,
}

export const getCompanySettings = cache(async (): Promise<CompanySettings> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('company_settings')
      .select('company_name, logo_path, time_zone')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) return fallbackSettings

    const row = data as { company_name: string; logo_path: string | null; time_zone: string | null }
    const companyName = row.company_name.trim() || defaultCompanyName
    const logoPath = row.logo_path && isCompanyLogoPath(row.logo_path) ? row.logo_path : null
    const logoUrl = logoPath
      ? supabase.storage.from(brandingBucket).getPublicUrl(logoPath).data.publicUrl
      : null

    return { companyName, logoUrl, timeZone: resolveTimeZone(row.time_zone) }
  } catch {
    return fallbackSettings
  }
})
