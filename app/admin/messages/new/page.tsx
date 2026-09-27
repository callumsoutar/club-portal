import type { Metadata } from 'next'

import { AdminMessageForm } from '@/components/admin-message-form'

export const metadata: Metadata = {
  title: 'New message',
}

export default function NewMessagePage() {
  return (
    <main className="message-editor-page">
      <AdminMessageForm />
    </main>
  )
}
