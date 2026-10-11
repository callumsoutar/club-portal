import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/flight/ui/button'
import { Page, PageHeader } from '@/components/portal/page'
import { CategoryDot } from '@/components/safety/article-row'
import { listAdminSafetyMessages } from '@/lib/admin-safety-messages'
import { getAdminUser } from '@/lib/auth'
import { safetyArticleHref } from '@/lib/safety-messages'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Manage articles',
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
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/fleet')

  const messages = await listAdminSafetyMessages()
  const drafts = messages.filter((message) => !message.isPublished).length

  return (
    <Page width="wide" className="gap-6">
      <PageHeader
        title="Manage articles"
        description={`${messages.length - drafts} published${drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}. Published articles appear in the Safety Hub and on the briefing room TV.`}
        actions={
          <Button asChild>
            <Link href="/admin/messages/new">
              <Plus data-icon="inline-start" />
              New article
            </Link>
          </Button>
        }
      />

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-sm font-medium">No articles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Write the first one and publish it to the Safety Hub.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={`/admin/messages/${message.id}`}
                className="group min-w-0 flex-1 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <p className="truncate text-sm font-medium group-hover:text-primary">{message.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <CategoryDot category={message.category} />
                  {message.category}
                  <span aria-hidden>·</span>
                  {message.publishedDate || `Updated ${formatUpdated(message.updatedAt)}`}
                  {message.tags.length > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{message.tags.join(', ')}</span>
                    </>
                  ) : null}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium',
                    message.isPublished ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning-foreground',
                  )}
                >
                  {message.isPublished ? 'Published' : 'Draft'}
                </span>
                {message.isPublished ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={safetyArticleHref(message.slug)}>
                      View
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/messages/${message.id}`}>Edit</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
