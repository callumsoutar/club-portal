import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AdminMessageForm } from '@/components/admin-message-form'
import { getAdminSafetyMessage } from '@/lib/admin-safety-messages'
import { getAdminUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Edit article',
}

export default async function EditMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const { saved } = await searchParams
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/fleet')

  const messageId = Number(id)
  if (!Number.isInteger(messageId) || messageId < 1) notFound()

  const message = await getAdminSafetyMessage(messageId)
  if (!message) notFound()

  return (
    <main className="message-editor-page">
      <AdminMessageForm message={message} saved={saved === '1'} />
    </main>
  )
}
