'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Pause, Play, Plus, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { MessageBody } from '@/components/message-body'
import { emphasizeTitle, type SafetyMessage } from '@/lib/safety-messages'

const SUMMARY_SLIDE_MS = 12_000
const FULL_SLIDE_MIN_MS = 24_000
const FULL_SLIDE_MAX_MS = 90_000
const textScales = [1, 1.12, 1.25, 1.4, 1.55]
const textScaleKey = 'safetyhub-slideshow-text-step'

function readTextStep() {
  if (typeof window === 'undefined') return 0
  const stored = Number(window.localStorage.getItem(textScaleKey))
  if (!Number.isInteger(stored) || stored < 0 || stored >= textScales.length) return 0
  return stored
}

const textStepListeners = new Set<() => void>()

function subscribeTextStep(onStoreChange: () => void) {
  textStepListeners.add(onStoreChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === textScaleKey) onStoreChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    textStepListeners.delete(onStoreChange)
    window.removeEventListener('storage', onStorage)
  }
}

function publishTextStep(step: number) {
  window.localStorage.setItem(textScaleKey, String(step))
  textStepListeners.forEach((listener) => listener())
}

export type SlideshowContent = 'summary' | 'full'

type TvSlideshowProps = {
  messages: SafetyMessage[]
  companyName: string
  logoUrl?: string | null
  /** Summary shows the short briefing and photo. Full shows the message body and hides the photo. */
  content?: SlideshowContent
  /** Preview keeps the exit control visible. The briefing-room display hides chrome while it runs. */
  mode?: 'preview' | 'kiosk'
  onExit?: () => void
}

function slideDurationMs(message: SafetyMessage | undefined, content: SlideshowContent) {
  if (!message || content === 'summary') return SUMMARY_SLIDE_MS
  const source = message.body.trim() || message.briefing
  const words = source.split(/\s+/).filter(Boolean).length
  return Math.min(FULL_SLIDE_MAX_MS, Math.max(FULL_SLIDE_MIN_MS, Math.round((words / 140) * 60_000)))
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

export function TvSlideshow({ messages, companyName, logoUrl = null, content = 'summary', mode = 'kiosk', onExit }: TvSlideshowProps) {
  const total = messages.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(SUMMARY_SLIDE_MS / 1000)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const textStep = useSyncExternalStore(subscribeTextStep, readTextStep, () => 0)
  const reducedMotion = usePrefersReducedMotion()
  const progressRef = useRef(0)
  const barRef = useRef<HTMLSpanElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const message = messages[index]
  const durationMs = slideDurationMs(message, content)
  const canAutoAdvance = total > 1 && !paused && !reducedMotion
  const slideToken = `${index}:${content}:${durationMs}`
  const [countdownSlide, setCountdownSlide] = useState(slideToken)
  if (countdownSlide !== slideToken) {
    setCountdownSlide(slideToken)
    setSecondsLeft(Math.round(durationMs / 1000))
  }

  const go = useCallback((delta: number) => {
    if (total < 2) return
    setIndex((current) => (current + delta + total) % total)
  }, [total])

  const paintProgress = useCallback((ratio: number) => {
    progressRef.current = ratio
    if (barRef.current) {
      barRef.current.style.width = `${ratio * 100}%`
      barRef.current.parentElement?.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
    }
  }, [])

  useEffect(() => {
    paintProgress(0)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [slideToken, paintProgress])

  useEffect(() => {
    if (!canAutoAdvance) return

    const origin = performance.now() - progressRef.current * durationMs
    let frame = 0

    const tick = (now: number) => {
      const ratio = (now - origin) / durationMs
      if (ratio >= 1) {
        paintProgress(0)
        setIndex((current) => (current + 1) % total)
        return
      }
      paintProgress(ratio)
      const body = bodyRef.current
      if (body && content === 'full') {
        const extra = body.scrollHeight - body.clientHeight
        body.scrollTop = extra > 0 ? extra * ratio : 0
      }
      const nextSeconds = Math.max(1, Math.ceil((1 - ratio) * (durationMs / 1000)))
      setSecondsLeft((current) => (current === nextSeconds ? current : nextSeconds))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [canAutoAdvance, content, durationMs, index, paintProgress, total])

  useEffect(() => {
    if (mode !== 'kiosk') return

    let wakeLock: WakeLockSentinel | null = null
    let cancelled = false

    const requestLock = async () => {
      if (!('wakeLock' in navigator) || cancelled) return
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch {
        wakeLock = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestLock()
    }

    void requestLock()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void wakeLock?.release()
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'kiosk') return

    let timer = window.setTimeout(() => setChromeVisible(false), 4000)
    const reveal = () => {
      setChromeVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setChromeVisible(false), 4000)
    }

    window.addEventListener('pointermove', reveal)
    window.addEventListener('pointerdown', reveal)
    window.addEventListener('click', reveal)
    window.addEventListener('keydown', reveal)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', reveal)
      window.removeEventListener('pointerdown', reveal)
      window.removeEventListener('click', reveal)
      window.removeEventListener('keydown', reveal)
    }
  }, [mode])

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  const changeTextSize = useCallback((delta: number) => {
    const next = Math.min(textScales.length - 1, Math.max(0, readTextStep() + delta))
    publishTextStep(next)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen can be denied outside a user gesture or in an embedded frame.
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('button, a')) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      } else if (event.key === ' ') {
        event.preventDefault()
        if (!reducedMotion && total > 1) setPaused((current) => !current)
      } else if (event.key === 'Escape' && onExit && !document.fullscreenElement) {
        onExit()
      } else if (event.key === 'f' || event.key === 'F') {
        void toggleFullscreen()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        changeTextSize(1)
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        changeTextSize(-1)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changeTextSize, go, onExit, reducedMotion, toggleFullscreen, total])

  if (!message) {
    return (
      <div className="slideshow">
        <div className="slide-top">
          <Logo companyName={companyName} logoUrl={logoUrl} />
          <ExitControl onExit={onExit} />
        </div>
        <div className="slide-layout">
          <div className="slide-copy">
            <div className="slide-label"><span></span> Briefing room</div>
            <h1>No safety messages are on display.</h1>
            <p>Published messages will rotate here for members waiting in the briefing room.</p>
          </div>
        </div>
      </div>
    )
  }

  const title = emphasizeTitle(message.title, message.emphasis)
  const showImage = content === 'summary' && Boolean(message.imageUrl)
  const fullBody = message.body.trim()
  const idle = mode === 'kiosk' && !chromeVisible
  const status = reducedMotion
    ? 'Auto-advance off'
    : paused
      ? 'Paused'
      : total > 1
        ? 'Auto-advancing'
        : 'On display'
  const countdown = !reducedMotion && !paused && total > 1 ? `Next in ${pad(secondsLeft)} seconds` : null

  return (
    <div className={`slideshow${idle ? ' is-idle' : ''}`} style={{ '--slide-scale': textScales[textStep] } as CSSProperties}>
      <div className="slide-top">
        <Logo companyName={companyName} logoUrl={logoUrl} />
        <div className="slide-chrome">
          <ExitControl onExit={onExit} />
        </div>
      </div>
      <div className={`slide-layout slide-stage${showImage ? '' : ' no-photo'}${content === 'full' ? ' full-text' : ''}`} key={`${content}-${message.id}`}>
        <div className={`slide-copy${content === 'full' ? ' is-full' : ''}`}>
          <div className="slide-label">
            <span></span>
            {message.category}
            <span className="slide-count">{pad(index + 1)} / {pad(total)}</span>
          </div>
          <h1>
            {title.before}
            {title.emphasis ? <em>{title.emphasis}</em> : null}
            {title.after}
          </h1>
          {content === 'full' ? (
            <div className="slide-body" ref={bodyRef}>
              {fullBody ? <div className="slide-article"><MessageBody markdown={message.body} /></div> : <p>{message.briefing}</p>}
            </div>
          ) : (
            <p>{message.briefing}</p>
          )}
          <div className="slide-date">{companyName} <span>·</span> {message.date}</div>
        </div>
        {showImage ? (
          <div className="slide-photo">
            <img src={message.imageUrl} alt={message.imageAlt} />
            {message.caption ? <div className="photo-caption">{message.caption}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="slide-bottom">
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-label="Time remaining on this safety message"
        >
          <span ref={barRef} />
        </div>
        <div className="slide-controls slide-chrome">
          <span>{status}</span>
          {countdown ? (
            <>
              <span className="control-divider"></span>
              <span className="slide-countdown">{countdown}</span>
            </>
          ) : null}
          <button
            type="button"
            aria-label="Decrease text size"
            disabled={textStep === 0}
            onClick={() => changeTextSize(-1)}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label="Increase text size"
            disabled={textStep === textScales.length - 1}
            onClick={() => changeTextSize(1)}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'}
            aria-pressed={paused}
            disabled={reducedMotion || total < 2}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button type="button" aria-label="Previous safety message" disabled={total < 2} onClick={() => go(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next safety message" disabled={total < 2} onClick={() => go(1)}>
            <ChevronRight size={18} />
          </button>
          <button type="button" aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} onClick={() => void toggleFullscreen()}>
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Safety message {index + 1} of {total}. {message.title}
      </p>
    </div>
  )
}

function ExitControl({ onExit }: { onExit?: () => void }) {
  if (onExit) {
    return (
      <button type="button" onClick={onExit} aria-label="Exit slideshow">
        <X size={20} /> Exit
      </button>
    )
  }

  return (
    <Link href="/" aria-label="Exit slideshow">
      <X size={20} /> Exit
    </Link>
  )
}
