import 'server-only'

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { mapSafetyMessage, type SafetyMessageRow } from '@/lib/safety-messages'

/** Every published message, newest first. Cached per request. */
export const getPublishedSafetyMessages = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('safety_messages')
    .select('id, slug, title, summary, body_markdown, category, image_url, image_alt, caption, published_date, featured, links')
    .eq('is_published', true)
    .order('published_date', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    throw new Error(`Could not load safety messages: ${error.message}`)
  }

  return ((data ?? []) as SafetyMessageRow[]).map(mapSafetyMessage)
})

export async function getPublishedSafetyMessage(slug: string) {
  const messages = await getPublishedSafetyMessages()
  return messages.find((message) => message.slug === slug) ?? null
}
