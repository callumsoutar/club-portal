'use server'

import { createClient } from '@/lib/supabase/server'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Records one opening of a published article and returns the new total. */
export async function recordSafetyArticleView(slug: string): Promise<number | null> {
  if (!slugPattern.test(slug) || slug.length > 200) return null

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('record_safety_message_view', {
    message_slug: slug,
  })

  if (error || typeof data !== 'number') return null
  return data
}
