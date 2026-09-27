import { z } from 'zod'

import { safetyMessageCategories } from '@/lib/safety-messages'

const httpsUrl = z.string().trim().regex(/^https:\/\/\S+$/, 'Use a full https link')

export const safetyMessageFormSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
  title: z.string().trim().min(1, 'Add a title'),
  summary: z.string().trim().min(1, 'Add a summary'),
  bodyMarkdown: z.string().trim().min(1, 'Add the message'),
  category: z.enum(safetyMessageCategories),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  links: z.array(z.object({
    label: z.string().trim().min(1, 'Add a label'),
    url: httpsUrl,
  })).max(12),
  linkLabel: z.string().trim(),
  linkUrl: z.string().trim(),
  imageUrl: z.string().trim(),
  imageAlt: z.string().trim(),
  caption: z.string().trim(),
  publishedDate: z.string().trim(),
  featured: z.boolean(),
}).superRefine((value, context) => {
  const hasLabel = value.linkLabel.length > 0
  const hasUrl = value.linkUrl.length > 0
  if (hasLabel !== hasUrl) {
    context.addIssue({
      code: 'custom',
      path: [hasUrl ? 'linkLabel' : 'linkUrl'],
      message: 'A featured link needs both a label and an https URL',
    })
  }
  if (hasUrl && !/^https:\/\/\S+$/.test(value.linkUrl)) {
    context.addIssue({
      code: 'custom',
      path: ['linkUrl'],
      message: 'Use a full https link',
    })
  }
  if (value.imageUrl && !/^https:\/\/\S+$/.test(value.imageUrl) && !/^\/[^/]/.test(value.imageUrl)) {
    context.addIssue({
      code: 'custom',
      path: ['imageUrl'],
      message: 'Use an https URL or a site path such as /images/photo.png',
    })
  }
  if (value.imageUrl && !value.imageAlt) {
    context.addIssue({
      code: 'custom',
      path: ['imageAlt'],
      message: 'Describe the image for people who cannot see it',
    })
  }
  if (value.publishedDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.publishedDate)) {
    context.addIssue({
      code: 'custom',
      path: ['publishedDate'],
      message: 'Use a valid date',
    })
  }
})

export const safetyMessageSaveSchema = safetyMessageFormSchema.safeExtend({
  intent: z.enum(['save', 'publish', 'unpublish']),
})

export type SafetyMessageFormValues = z.infer<typeof safetyMessageFormSchema>
export type SafetyMessageSaveInput = z.infer<typeof safetyMessageSaveSchema>

export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function todayInNewZealand() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
