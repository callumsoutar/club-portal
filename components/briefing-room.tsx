'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { SlideshowStart } from '@/components/slideshow-start'
import { TvSlideshow, type SlideshowContent } from '@/components/tv-slideshow'
import { type SafetyMessage } from '@/lib/safety-messages'

type BriefingRoomProps = {
  messages: SafetyMessage[]
  companyName: string
  logoUrl: string | null
  initialContent: SlideshowContent | null
}

export function BriefingRoom({ messages, companyName, logoUrl, initialContent }: BriefingRoomProps) {
  const router = useRouter()
  const [content, setContent] = useState<SlideshowContent | null>(initialContent)

  useEffect(() => {
    document.body.classList.add('tv-body')
    return () => document.body.classList.remove('tv-body')
  }, [])

  function choose(next: SlideshowContent) {
    setContent(next)
    router.replace(`/tv?view=${next}`, { scroll: false })
  }

  function backToChoices() {
    setContent(null)
    router.replace('/tv', { scroll: false })
  }

  if (!content) {
    return <SlideshowStart companyName={companyName} logoUrl={logoUrl} onChoose={choose} />
  }

  return (
    <TvSlideshow
      messages={messages}
      companyName={companyName}
      logoUrl={logoUrl}
      content={content}
      mode="kiosk"
      onExit={backToChoices}
    />
  )
}
