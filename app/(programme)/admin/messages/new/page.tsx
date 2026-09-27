import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AdminMessageForm } from '@/components/admin-message-form'
import { getAdminUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'New message',
}

export default async function NewMessagePage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/fleet')

  return (
    <main className="message-editor-page">
      <AdminMessageForm />
    </main>
  )
}
