import 'server-only'

import { heroImageUrl } from '@/lib/message-images'
import { createClient } from '@/lib/supabase/server'
import type { SafetyMessageLink } from '@/lib/safety-messages'
import type { SafetyMessageFormValues } from '@/lib/safety-message-schema'

const columns = 'id, slug, title, summary, body_markdown, category, tags, links, link_url, link_label, image_url, image_alt, caption, published_date, is_published, featured, updated_at' as const

export type AdminSafetyMessage = SafetyMessageFormValues & {
  id: number
  isPublished: boolean
  updatedAt: string
}

type AdminSafetyMessageRow = {
  id: number
  slug: string
  title: string
  summary: string
  body_markdown: string
  category: SafetyMessageFormValues['category']
  tags: string[] | null
  links: unknown
  link_url: string | null
  link_label: string | null
  image_url: string | null
  image_alt: string | null
  caption: string | null
  published_date: string | null
  is_published: boolean
  featured: boolean
  updated_at: string
}

function parseLinks(value: unknown): SafetyMessageLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { label?: unknown; url?: unknown }
    const label = typeof record.label === 'string' ? record.label.trim() : ''
    const url = typeof record.url === 'string' ? record.url.trim() : ''
    if (!label || !url.startsWith('https://')) return []
    return [{ label, url }]
  })
}

export function mapAdminSafetyMessage(row: AdminSafetyMessageRow): AdminSafetyMessage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    bodyMarkdown: row.body_markdown,
    category: row.category,
    tags: row.tags ?? [],
    links: parseLinks(row.links),
    linkLabel: row.link_label ?? '',
    linkUrl: row.link_url ?? '',
    imageUrl: heroImageUrl(row.image_url),
    imageAlt: row.image_alt ?? '',
    caption: row.caption ?? '',
    publishedDate: row.published_date ?? '',
    featured: row.featured,
    isPublished: row.is_published,
    updatedAt: row.updated_at,
  }
}

export async function listAdminSafetyMessages() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('safety_messages')
    .select(columns)
    .order('published_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })

  if (error) throw new Error(`Could not load safety messages: ${error.message}`)
  return ((data ?? []) as AdminSafetyMessageRow[]).map(mapAdminSafetyMessage)
}

export async function getAdminSafetyMessage(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('safety_messages')
    .select(columns)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Could not load the safety message: ${error.message}`)
  return data ? mapAdminSafetyMessage(data as AdminSafetyMessageRow) : null
}
