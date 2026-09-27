'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { updateCompanySettings } from '@/app/admin/settings/actions'
import { Logo } from '@/components/logo'
import { type CompanySettings } from '@/lib/company-settings'

const formSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter the club name.').max(80, 'Keep the club name under 80 characters.'),
})

type FormValues = z.infer<typeof formSchema>

export function CompanySettingsForm({ companyName, logoUrl }: CompanySettings) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const [removeLogo, setRemoveLogo] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { companyName },
  })

  const watchedName = form.watch('companyName')
  const displayName = watchedName.trim() || companyName
  const displayLogo = removeLogo ? null : (previewUrl ?? logoUrl)

  function onFileChange(file: File | undefined) {
    setSaved(false)
    setError(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return file ? URL.createObjectURL(file) : null
    })
    if (file) setRemoveLogo(false)
  }

  function clearLogoFile() {
    if (fileRef.current) fileRef.current.value = ''
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  function onSubmit(values: FormValues) {
    const body = new FormData()
    body.set('companyName', values.companyName)
    if (removeLogo) body.set('removeLogo', '1')
    const file = fileRef.current?.files?.[0]
    if (file) body.set('logo', file)

    startTransition(async () => {
      const result = await updateCompanySettings(body)
      if (!result.ok) {
        setError(result.error)
        setSaved(false)
        return
      }
      setError(null)
      setSaved(true)
      clearLogoFile()
      setRemoveLogo(false)
      router.refresh()
    })
  }

  return (
    <form className="admin-form" onSubmit={form.handleSubmit(onSubmit)}>
      <section>
        <h2>Club name</h2>
        <label>
          Display name
          <input {...form.register('companyName')} autoComplete="organization" />
        </label>
        {form.formState.errors.companyName ? (
          <p className="form-error">{form.formState.errors.companyName.message}</p>
        ) : (
          <p className="publish-note">Used in the header, page titles, and the briefing-room slideshow.</p>
        )}
      </section>
      <section>
        <h2>Logo</h2>
        <div className="settings-logo-preview">
          <Logo companyName={displayName} logoUrl={displayLogo} />
        </div>
        <p className="publish-note">
          JPEG, PNG, or WebP, up to 2 MB. An uploaded logo replaces the name mark in the header and on the TV.
        </p>
        <label className="file-picker">
          Logo file
          <input
            ref={fileRef}
            id="company-logo"
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onFileChange(event.target.files?.[0])}
          />
        </label>
        {logoUrl || previewUrl ? (
          <button
            className="admin-text"
            type="button"
            onClick={() => {
              setRemoveLogo(true)
              setSaved(false)
              clearLogoFile()
            }}
          >
            Remove logo
          </button>
        ) : null}
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-success">Club settings saved.</p> : null}
      <div className="admin-actions">
        <button className="admin-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
