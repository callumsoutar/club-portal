'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getAdminUser } from '@/lib/auth'
import {
  brandingBucket,
  companyLogoExtension,
  companyLogoMaxBytes,
  isCompanyLogoPath,
} from '@/lib/company-settings'
import { createClient } from '@/lib/supabase/server'

const companyNameSchema = z.string().trim().min(2, 'Enter the club name.').max(80, 'Keep the club name under 80 characters.')

export type UpdateCompanySettingsResult = { ok: true } | { ok: false; error: string }

export async function updateCompanySettings(formData: FormData): Promise<UpdateCompanySettingsResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Sign in as an admin to update club settings.' }

  const parsedName = companyNameSchema.safeParse(formData.get('companyName'))
  if (!parsedName.success) {
    return { ok: false, error: parsedName.error.issues[0]?.message ?? 'Enter the club name.' }
  }

  const supabase = await createClient()
  const { data: current, error: readError } = await supabase
    .from('company_settings')
    .select('logo_path')
    .eq('id', 1)
    .maybeSingle()

  if (readError || !current) {
    return { ok: false, error: 'Club settings are not available yet.' }
  }

  const previousPath = logoPathOf(current)
  const uploaded = formData.get('logo')
  const hasFile = uploaded instanceof File && uploaded.size > 0
  const removeLogo = formData.get('removeLogo') === '1' && !hasFile
  let nextPath = removeLogo ? null : previousPath
  let uploadedPath: string | null = null

  if (hasFile) {
    const extension = companyLogoExtension(uploaded)
    if (!extension) return { ok: false, error: 'Use a JPEG, PNG, or WebP logo.' }
    if (uploaded.size > companyLogoMaxBytes) return { ok: false, error: 'Logos must be 2 MB or smaller.' }

    uploadedPath = `logos/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(brandingBucket).upload(uploadedPath, uploaded, {
      contentType: uploaded.type,
      cacheControl: '31536000',
      upsert: false,
    })

    if (uploadError) return { ok: false, error: 'The logo could not be uploaded.' }
    nextPath = uploadedPath
  }

  const { error: updateError } = await supabase
    .from('company_settings')
    .update({ company_name: parsedName.data, logo_path: nextPath })
    .eq('id', 1)

  if (updateError) {
    if (uploadedPath) await supabase.storage.from(brandingBucket).remove([uploadedPath])
    return { ok: false, error: 'Club settings could not be saved.' }
  }

  if (previousPath && previousPath !== nextPath) {
    await supabase.storage.from(brandingBucket).remove([previousPath])
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

function logoPathOf(row: unknown) {
  if (!row || typeof row !== 'object' || !('logo_path' in row)) return null
  const path = (row as { logo_path: unknown }).logo_path
  return typeof path === 'string' && isCompanyLogoPath(path) ? path : null
}
