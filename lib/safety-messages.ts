import { heroImageUrl } from '@/lib/message-images'

export type SafetyMessageLink = {
  label: string
  url: string
}

export const safetyMessageCategories = [
  'Aerodrome & Circuit',
  'Aircraft & Engine',
  'Airmanship',
  'Airspace & Radio',
  'Emergencies',
  'Ground Ops',
  'Human Factors',
  'Procedures & SOPs',
  'Weather',
] as const

export type SafetyMessageCategory = (typeof safetyMessageCategories)[number]

export type SafetyMessage = {
  databaseId: number
  id: string
  slug: string
  title: string
  /** Phrase within the title that the TV slide highlights. */
  emphasis?: string
  category: string
  date: string
  /** ISO `YYYY-MM-DD`, or null when the article has no publish date. */
  publishedOn: string | null
  read: string
  description: string
  /** Short line written to be read from across the briefing room. */
  briefing: string
  caption: string
  imageAlt: string
  imageUrl: string
  body: string
  links: SafetyMessageLink[]
  featured?: boolean
}

/** Row shape returned by the public safety_messages select. */
export type SafetyMessageRow = {
  id: number
  slug: string
  title: string
  summary: string
  body_markdown: string
  category: string
  image_url: string | null
  image_alt: string | null
  caption: string | null
  published_date: string | null
  featured: boolean
  links: unknown
}

export function emphasizeTitle(title: string, emphasis?: string) {
  if (!emphasis) return { before: title, emphasis: '', after: '' }
  const index = title.toLowerCase().indexOf(emphasis.toLowerCase())
  if (index === -1) return { before: title, emphasis: '', after: '' }
  return {
    before: title.slice(0, index),
    emphasis: title.slice(index, index + emphasis.length),
    after: title.slice(index + emphasis.length),
  }
}

export function categoryClass(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** URL-safe category key, e.g. `Airspace & Radio` → `airspace-radio`. */
export const categorySlug = categoryClass

export function categoryFromSlug(slug: string | null | undefined) {
  if (!slug) return null
  return safetyMessageCategories.find((category) => categorySlug(category) === slug) ?? null
}

export function safetyArticleHref(slug: string) {
  return `/safety/${slug}`
}

export function safetyCategoryHref(category: string) {
  return `/safety?category=${categorySlug(category)}`
}

/** List-view fields only, so index pages don't ship every article body. */
export type SafetyArticleSummary = Pick<
  SafetyMessage,
  | 'slug'
  | 'title'
  | 'category'
  | 'date'
  | 'publishedOn'
  | 'read'
  | 'description'
  | 'imageUrl'
  | 'imageAlt'
>

export function toArticleSummary(message: SafetyMessage): SafetyArticleSummary {
  return {
    slug: message.slug,
    title: message.title,
    category: message.category,
    date: message.date,
    publishedOn: message.publishedOn,
    read: message.read,
    description: message.description,
    imageUrl: message.imageUrl,
    imageAlt: message.imageAlt,
  }
}

export function mapSafetyMessage(row: SafetyMessageRow): SafetyMessage {
  const imageUrl = heroImageUrl(row.image_url)

  return {
    databaseId: row.id,
    id: row.slug,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.published_date ? formatPublishedDate(row.published_date) : '',
    publishedOn: row.published_date,
    read: readingTime(row.body_markdown),
    description: row.summary,
    briefing: row.summary,
    caption: row.caption?.trim() ?? '',
    imageAlt: row.image_alt?.trim() || (imageUrl ? row.title : ''),
    imageUrl,
    body: row.body_markdown,
    links: parseLinks(row.links),
    featured: row.featured,
  }
}

function formatPublishedDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function readingTime(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 200))
  return `${minutes} min read`
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
