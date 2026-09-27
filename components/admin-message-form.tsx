'use client'

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ImagePlus } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { removeSafetyMessageImage, saveSafetyMessage, uploadSafetyMessageImage } from '@/app/(programme)/admin/actions'
import { MarkdownEditor } from '@/components/markdown-editor'
import { safetyMessageCategories } from '@/lib/safety-messages'
import {
  safetyMessageFormSchema,
  slugifyTitle,
  type SafetyMessageFormValues,
} from '@/lib/safety-message-schema'

type EditableMessage = SafetyMessageFormValues & {
  id: number
  isPublished: boolean
}

type SaveIntent = 'save' | 'publish' | 'unpublish'

const emptyValues: SafetyMessageFormValues = {
  slug: '',
  title: '',
  summary: '',
  bodyMarkdown: '',
  category: 'Airmanship',
  tags: [],
  links: [],
  linkLabel: '',
  linkUrl: '',
  imageUrl: '',
  imageAlt: '',
  caption: '',
  publishedDate: '',
  featured: false,
}

export function AdminMessageForm({
  message,
  saved = false,
}: {
  message?: EditableMessage
  saved?: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(saved)
  const [imageNotice, setImageNotice] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [activeIntent, setActiveIntent] = useState<SaveIntent | null>(null)
  const [pending, startTransition] = useTransition()
  const form = useForm<SafetyMessageFormValues>({
    resolver: zodResolver(safetyMessageFormSchema),
    defaultValues: message
      ? {
          id: message.id,
          slug: message.slug,
          title: message.title,
          summary: message.summary,
          bodyMarkdown: message.bodyMarkdown,
          category: message.category,
          tags: message.tags,
          links: message.links,
          linkLabel: message.linkLabel,
          linkUrl: message.linkUrl,
          imageUrl: message.imageUrl,
          imageAlt: message.imageAlt,
          caption: message.caption,
          publishedDate: message.publishedDate,
          featured: message.featured,
        }
      : emptyValues,
  })
  const links = useFieldArray({ control: form.control, name: 'links' })
  const tags = form.watch('tags')
  const title = form.watch('title')
  const imageUrl = form.watch('imageUrl')
  const imageAlt = form.watch('imageAlt')
  const isDirty = form.formState.isDirty
  const heading = title.trim() || (message ? 'Untitled message' : 'New safety message')
  const busy = pending || uploading

  useEffect(() => {
    if (isDirty) setSavedNotice(false)
  }, [isDirty])

  function submit(intent: SaveIntent) {
    const filledLinks = form.getValues('links').filter((link) => link.label.trim() || link.url.trim())
    form.setValue('links', filledLinks)
    void form.handleSubmit((values) => {
      const nextValues = {
        ...values,
        links: values.links.filter((link) => link.label.trim() || link.url.trim()),
      }
      const payload = { ...nextValues, intent }
      setError(null)
      setActiveIntent(intent)
      startTransition(async () => {
        const result = await saveSafetyMessage(payload)
        setActiveIntent(null)
        if (!result.ok) {
          setError(result.error)
          return
        }
        form.reset(nextValues)
        setSavedNotice(true)
        if (!message) {
          router.push(`/admin/messages/${result.id}?saved=1`)
          return
        }
        router.refresh()
      })
    }, () => {
      setError('Check the highlighted fields before saving.')
      requestAnimationFrame(() => {
        document.querySelector('.message-editor .form-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    })()
  }

  async function uploadFile(file: File) {
    const nextAlt = form.getValues('imageAlt').trim() || form.getValues('title').trim()
    if (!nextAlt) {
      setError('Add an image description, or a title, before uploading.')
      return
    }

    form.setValue('imageAlt', nextAlt, { shouldValidate: true, shouldDirty: true })
    const body = new FormData()
    body.set('file', file)
    body.set('imageAlt', nextAlt)
    body.set('previousUrl', form.getValues('imageUrl'))
    if (message?.id) body.set('messageId', String(message.id))

    setError(null)
    setImageNotice(null)
    setUploading(true)
    const result = await uploadSafetyMessageImage(body)
    setUploading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    form.setValue('imageUrl', result.url, { shouldDirty: !result.saved, shouldValidate: true })
    setImageNotice(result.saved ? 'Hero image saved.' : 'Image uploaded. Save the message to keep it.')
  }

  function onImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void uploadFile(file)
  }

  function onDropImage(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    if (busy) return
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  async function onRemoveImage() {
    const currentUrl = form.getValues('imageUrl')
    if (!currentUrl) return
    setError(null)
    setUploading(true)
    const result = await removeSafetyMessageImage({ messageId: message?.id, imageUrl: currentUrl })
    setUploading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    form.setValue('imageUrl', '', { shouldDirty: !message, shouldValidate: true })
    setImageNotice(message ? 'Hero image removed.' : null)
  }

  function addTag() {
    const next = tagDraft.trim()
    if (!next || tags.includes(next) || tags.length >= 20) return
    form.setValue('tags', [...tags, next], { shouldDirty: true, shouldValidate: true })
    setTagDraft('')
  }

  const saveLabel = pending && activeIntent === 'save'
    ? 'Saving…'
    : message?.isPublished ? 'Save changes' : 'Save draft'

  return (
    <form className="message-editor" noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="editor-bar">
        <div className="editor-bar-inner">
          <div className="editor-bar-copy">
            <Link className="editor-back" href="/admin">
              <ChevronLeft size={16} aria-hidden="true" />
              All messages
            </Link>
            <div className="editor-heading">
              <h1>{heading}</h1>
              <span className={message?.isPublished ? 'status published' : 'status draft'}>
                {message?.isPublished ? 'Published' : 'Draft'}
              </span>
              {isDirty ? <span className="editor-dirty">Unsaved</span> : null}
            </div>
          </div>
          <div className="editor-bar-actions">
            <button type="button" className="admin-secondary" disabled={busy} onClick={() => submit('save')}>
              {saveLabel}
            </button>
            {message?.isPublished ? (
              <button type="button" className="admin-secondary" disabled={busy} onClick={() => submit('unpublish')}>
                {pending && activeIntent === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
              </button>
            ) : (
              <button type="button" className="admin-primary" disabled={busy} onClick={() => submit('publish')}>
                {pending && activeIntent === 'publish' ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
        </div>
      </div>

      {savedNotice ? <p className="editor-banner success" role="status">Saved.</p> : null}
      {error ? <p className="editor-banner error" role="alert">{error}</p> : null}

      <div className="editor-layout">
        <div className="editor-main">
          <EditorCard
            title="Message"
            hint="The title, summary, and body members read on the site and the briefing-room TV."
          >
            <label>
              Title
              <input className="title-input" {...form.register('title')} placeholder="What should members remember?" />
              <FieldError message={form.formState.errors.title?.message} />
            </label>
            <div className="editor-field">
              <label htmlFor="message-slug">Address</label>
              <div className="slug-field">
                <span aria-hidden="true">/</span>
                <input id="message-slug" {...form.register('slug')} spellCheck={false} autoComplete="off" placeholder="message-address" />
                <button
                  type="button"
                  onClick={() => form.setValue('slug', slugifyTitle(form.getValues('title')), { shouldValidate: true, shouldDirty: true })}
                >
                  Use the title
                </button>
              </div>
              <FieldError message={form.formState.errors.slug?.message} />
              {form.formState.errors.slug ? null : <p className="editor-hint">Lowercase letters, numbers, and hyphens.</p>}
            </div>
            <label>
              Summary
              <textarea {...form.register('summary')} rows={3} placeholder="One or two sentences for the homepage and the TV." />
              <FieldError message={form.formState.errors.summary?.message} />
            </label>
            <Controller
              name="bodyMarkdown"
              control={form.control}
              render={({ field, fieldState }) => (
                <MarkdownEditor
                  id="bodyMarkdown"
                  name={field.name}
                  value={field.value}
                  error={fieldState.error?.message}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              )}
            />
          </EditorCard>
        </div>

        <aside className="editor-side">
          <EditorCard
            title="Publishing"
            hint={message?.isPublished
              ? 'Live on the public site and the briefing-room TV.'
              : 'Only admins can see this until you publish it.'}
          >
            <label className="editor-switch">
              <span>Feature this message</span>
              <input type="checkbox" {...form.register('featured')} />
            </label>
            <label>
              Published date
              <input type="date" {...form.register('publishedDate')} />
              <FieldError message={form.formState.errors.publishedDate?.message} />
              {form.formState.errors.publishedDate ? null : <p className="editor-hint">Leave blank to use today when you publish.</p>}
            </label>
          </EditorCard>

          <EditorCard title="Details" hint="Category and tags help people find this in the archive.">
            <label>
              Category
              <select {...form.register('category')}>
                {safetyMessageCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <FieldError message={form.formState.errors.category?.message} />
            </label>
            <div className="editor-field">
              <span className="field-label">Tags</span>
              <div className="tag-editor">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-chip"
                    onClick={() => form.setValue('tags', tags.filter((item) => item !== tag), { shouldDirty: true })}
                  >
                    {tag} <span aria-hidden="true">×</span>
                    <span className="sr-only">Remove {tag}</span>
                  </button>
                ))}
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    addTag()
                  }}
                  placeholder={tags.length >= 20 ? 'Tag limit reached' : 'Add a tag'}
                  disabled={tags.length >= 20}
                  aria-label="Add a tag"
                />
                <button type="button" className="tag-add" onClick={addTag} disabled={tags.length >= 20}>Add</button>
              </div>
              <p className="editor-hint">Press Enter to add. Click a tag to remove it.</p>
            </div>
          </EditorCard>

          <EditorCard title="Hero image" hint="Shown on the homepage, the article, and the TV. Leave it empty for no photo.">
            <input type="hidden" {...form.register('imageUrl')} />
            <div
              className={dragOver ? 'hero-frame is-dragover' : 'hero-frame'}
              onDragOver={(event) => {
                event.preventDefault()
                if (!busy) setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDropImage}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={imageAlt || ''} />
              ) : (
                <div className="hero-empty">
                  <ImagePlus size={22} aria-hidden="true" />
                  <p>Drop a photo here</p>
                  <small>JPEG, PNG, or WebP, up to 5 MB</small>
                </div>
              )}
            </div>
            {imageNotice ? <p className="form-success" role="status">{imageNotice}</p> : null}
            <label>
              Image description
              <input {...form.register('imageAlt')} placeholder="What is in the photo?" />
              <FieldError message={form.formState.errors.imageAlt?.message} />
            </label>
            <label>
              Caption
              <input {...form.register('caption')} placeholder="Optional caption on the photo" />
            </label>
            <div className="hero-actions">
              <button type="button" className="admin-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                {uploading ? 'Uploading…' : imageUrl ? 'Replace image' : 'Upload image'}
              </button>
              {imageUrl ? (
                <button type="button" className="admin-text" disabled={busy} onClick={() => void onRemoveImage()}>
                  Remove image
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Hero image file"
              onChange={onImageFile}
              disabled={busy}
            />
            <FieldError message={form.formState.errors.imageUrl?.message} />
          </EditorCard>

          <EditorCard title="Links" hint="Related links appear under the article as further reading.">
            <div className="link-stack">
              <div className="link-block">
                <div className="link-block-head">Featured link</div>
                <label>
                  Label
                  <input {...form.register('linkLabel')} />
                  <FieldError message={form.formState.errors.linkLabel?.message} />
                </label>
                <label>
                  URL
                  <input {...form.register('linkUrl')} placeholder="https://" spellCheck={false} />
                  <FieldError message={form.formState.errors.linkUrl?.message} />
                </label>
              </div>
              {links.fields.map((field, index) => (
                <div className="link-block" key={field.id}>
                  <div className="link-block-head">
                    <span>Related link</span>
                    <button type="button" className="admin-text" onClick={() => links.remove(index)}>Remove</button>
                  </div>
                  <label>
                    Label
                    <input {...form.register(`links.${index}.label`)} />
                    <FieldError message={form.formState.errors.links?.[index]?.label?.message} />
                  </label>
                  <label>
                    URL
                    <input {...form.register(`links.${index}.url`)} placeholder="https://" spellCheck={false} />
                    <FieldError message={form.formState.errors.links?.[index]?.url?.message} />
                  </label>
                </div>
              ))}
            </div>
            <button type="button" className="admin-secondary" onClick={() => links.append({ label: '', url: '' })}>
              Add a related link
            </button>
          </EditorCard>
        </aside>
      </div>
    </form>
  )
}

function EditorCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="editor-card">
      <header className="editor-card-head">
        <h2>{title}</h2>
        <p>{hint}</p>
      </header>
      {children}
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <small className="form-error">{message}</small>
}
