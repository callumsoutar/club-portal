import Link from 'next/link'
import { X } from 'lucide-react'

import { Logo } from '@/components/logo'
import { type SlideshowContent } from '@/components/tv-slideshow'

type SlideshowStartProps = {
  companyName: string
  logoUrl?: string | null
  onChoose: (content: SlideshowContent) => void
  onLeave?: () => void
  leaveHref?: string
}

export function SlideshowStart({ companyName, logoUrl = null, onChoose, onLeave, leaveHref = '/' }: SlideshowStartProps) {
  return (
    <div className="slideshow slideshow-start">
      <div className="slide-top">
        <Logo companyName={companyName} logoUrl={logoUrl} />
        {onLeave ? (
          <button type="button" onClick={onLeave} aria-label="Leave slideshow">
            <X size={20} /> Exit
          </button>
        ) : (
          <Link href={leaveHref} aria-label="Leave slideshow">
            <X size={20} /> Exit
          </Link>
        )}
      </div>
      <div className="start-panel">
        <div className="slide-label"><span></span> Briefing room</div>
        <h1>Choose how these messages play.</h1>
        <div className="start-options">
          <button type="button" onClick={() => onChoose('summary')}>
            <strong>Summary</strong>
            <span>The short briefing and its photo.</span>
          </button>
          <button type="button" onClick={() => onChoose('full')}>
            <strong>Full message</strong>
            <span>The complete text, with the photo left off so there is room to read.</span>
          </button>
        </div>
      </div>
    </div>
  )
}
