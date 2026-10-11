'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getAdminUser } from '@/lib/auth'
import {
  heroImageUrl,
  imageExtension,
  safetyMessageImageBucket,
  safetyMessageImageMaxBytes,
  storageObjectPath,
} from '@/lib/message-images'
import { createClient } from '@/lib/supabase/server'
import { safetyMessageSaveSchema, todayInNewZealand, type SafetyMessageSaveInput } from '@/lib/safety-message-schema'

export type SaveSafetyMessageResult = { ok: true; id: number } | { ok: false; error: string }

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function saveSafetyMessage(input: SafetyMessageSaveInput): Promise<SaveSafetyMessageResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Sign in as an admin to save this message.' }

  const parsed = safetyMessageSaveSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }

  const value = parsed.data
  const supabase = await createClient()
  let currentlyPublished = false

  if (value.id) {
    const { data, error } = await supabase
      .from('safety_messages')
      .select('is_published')
      .eq('id', value.id)
      .maybeSingle()

    if (error || !data) return { ok: false, error: 'That message could not be found.' }
    currentlyPublished = Boolean((data as { is_published: boolean }).is_published)
  }

  const isPublished = value.intent === 'publish'
    ? true
    : value.intent === 'unpublish'
      ? false
      : value.id ? currentlyPublished : false

  const publishedDate = isPublished
    ? (value.publishedDate || todayInNewZealand())
    : emptyToNull(value.publishedDate)

  const record = {
    slug: value.slug,
    title: value.title,
    summary: value.summary,
    body_markdown: value.bodyMarkdown,
    category: value.category,
    tags: value.tags,
    links: value.links,
    link_url: emptyToNull(value.linkUrl),
    link_label: emptyToNull(value.linkLabel),
    image_url: emptyToNull(heroImageUrl(value.imageUrl)),
    image_alt: emptyToNull(value.imageAlt),
    caption: emptyToNull(value.caption),
    published_date: publishedDate,
    is_published: isPublished,
    featured: value.featured,
  }

  if (value.id) {
    const { error } = await supabase.from('safety_messages').update(record).eq('id', value.id)
    if (error) return { ok: false, error: messageForWriteError(error.message) }
    revalidateMessagePaths()
    return { ok: true, id: value.id }
  }

  const { data, error } = await supabase
    .from('safety_messages')
    .insert(record)
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: messageForWriteError(error?.message) }
  revalidateMessagePaths()
  return { ok: true, id: Number((data as { id: number }).id) }
}

export async function uploadSafetyMessageImage(formData: FormData): Promise<
  { ok: true; url: string; saved: boolean } | { ok: false; error: string }
> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Sign in as an admin to upload an image.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose an image to upload.' }
  }

  const extension = imageExtension(file)
  if (!extension) return { ok: false, error: 'Use a JPEG, PNG, or WebP image.' }
  if (file.size > safetyMessageImageMaxBytes) {
    return { ok: false, error: 'Images must be 5 MB or smaller.' }
  }

  const imageAlt = String(formData.get('imageAlt') ?? '').trim()
  if (!imageAlt) return { ok: false, error: 'Describe the image before uploading it.' }

  const messageId = positiveId(formData.get('messageId'))
  const folder = messageId ? String(messageId) : 'new'
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from(safetyMessageImageBucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) return { ok: false, error: 'The image could not be uploaded.' }

  const { data } = supabase.storage.from(safetyMessageImageBucket).getPublicUrl(path)
  const url = data.publicUrl

  if (!messageId) return { ok: true, url, saved: false }

  const { error: updateError } = await supabase
    .from('safety_messages')
    .update({ image_url: url, image_alt: imageAlt })
    .eq('id', messageId)

  if (updateError) {
    await supabase.storage.from(safetyMessageImageBucket).remove([path])
    return { ok: false, error: 'The image uploaded, but it could not be saved on the message.' }
  }

  await removeStoredImage(supabase, String(formData.get('previousUrl') ?? ''))
  revalidateMessagePaths()
  return { ok: true, url, saved: true }
}

export async function removeSafetyMessageImage(input: {
  messageId?: number
  imageUrl: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Sign in as an admin to remove an image.' }

  const supabase = await createClient()
  const messageId = positiveId(input.messageId)

  if (messageId) {
    const { error } = await supabase
      .from('safety_messages')
      .update({ image_url: null, image_alt: null })
      .eq('id', messageId)
    if (error) return { ok: false, error: 'The image could not be removed.' }
    revalidateMessagePaths()
  }

  await removeStoredImage(supabase, input.imageUrl)
  return { ok: true }
}

async function removeStoredImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageUrl: string,
) {
  const path = storageObjectPath(heroImageUrl(imageUrl))
  if (!path) return
  await supabase.storage.from(safetyMessageImageBucket).remove([path])
}

function positiveId(value: unknown) {
  const id = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function revalidateMessagePaths() {
  revalidatePath('/')
  revalidatePath('/safety', 'layout')
  revalidatePath('/tv')
  revalidatePath('/admin')
}

function messageForWriteError(message: string | undefined) {
  if (!message) return 'The message could not be saved.'
  if (message.includes('safety_messages_slug_key') || message.includes('duplicate key')) {
    return 'Another message already uses that address. Choose a different one.'
  }
  return 'The message could not be saved. Check the fields and try again.'
}
