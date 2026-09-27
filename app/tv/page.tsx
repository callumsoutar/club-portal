import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BriefingRoom } from '@/components/briefing-room'
import { type SlideshowContent } from '@/components/tv-slideshow'
import { getAdminUser } from '@/lib/auth'
import { getCompanySettings } from '@/lib/get-company-settings'
import { getPublishedSafetyMessages } from '@/lib/get-published-safety-messages'

function slideshowContent(value: string | undefined): SlideshowContent | null {
  return value === 'summary' || value === 'full' ? value : null
}

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await getCompanySettings()
  return {
    title: 'Briefing room',
    description: `Rotating safety messages for the ${companyName} briefing room display.`,
  }
}

export default async function BriefingRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const content = slideshowContent(view)
  const admin = await getAdminUser()
  if (!admin) redirect(content ? `/login?next=${encodeURIComponent(`/tv?view=${content}`)}` : '/login?next=/tv')
  const [messages, company] = await Promise.all([
    getPublishedSafetyMessages(),
    getCompanySettings(),
  ])
  return (
    <BriefingRoom
      messages={messages}
      companyName={company.companyName}
      logoUrl={company.logoUrl}
      initialContent={content}
    />
  )
}
