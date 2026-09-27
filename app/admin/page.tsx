import type { Metadata } from 'next'
import Link from 'next/link'

import { listAdminSafetyMessages } from '@/lib/admin-safety-messages'

export const metadata: Metadata = {
  title: 'Messages',
}

function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Pacific/Auckland',
  }).format(new Date(iso))
}

export default async function AdminMessagesPage() {
  const messages = await listAdminSafetyMessages()

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Safety messages</p>
          <h1>Edit and publish</h1>
        </div>
        <Link className="admin-primary" href="/admin/messages/new">New message</Link>
      </div>
      <ul className="admin-list">
        {messages.map((message) => (
          <li key={message.id}>
            <div>
              <strong>{message.title}</strong>
              <span>{message.category}</span>
              {message.tags.length > 0 ? <span>{message.tags.join(', ')}</span> : null}
            </div>
            <span className={message.isPublished ? 'status published' : 'status draft'}>
              {message.isPublished ? 'Published' : 'Draft'}
            </span>
            <time>{message.publishedDate || formatUpdated(message.updatedAt)}</time>
            <Link href={`/admin/messages/${message.id}`}>Edit</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
