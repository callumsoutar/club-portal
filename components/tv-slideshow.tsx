'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
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

/** Time parked at the top and bottom so the entrance animation isn't stacked on the crawl. */
const CRAWL_HOLD_MS = 800

function crawlRatio(ratio: number, durationMs: number) {
  const hold = Math.min(0.18, CRAWL_HOLD_MS / Math.max(durationMs, 1))
  if (ratio <= hold) return 0
  if (ratio >= 1 - hold) return 1
  return (ratio - hold) / (1 - hold * 2)
}

function readTranslateY(element: HTMLElement) {
  const transform = getComputedStyle(element).transform
  if (!transform || transform === 'none') return 0
  return new DOMMatrixReadOnly(transform).m42
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
  const [chromeVisible, setChromeVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const textStep = useSyncExternalStore(subscribeTextStep, readTextStep, () => 0)
  const reducedMotion = usePrefersReducedMotion()
  const progressRef = useRef(0)
  const barRef = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollLockRef = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLDivElement>(null)
  const distanceRef = useRef(0)
  const crawlingRef = useRef(false)
  const seenSlideRef = useRef<string | null>(null)
  const message = messages[index]
  const durationMs = slideDurationMs(message, content)
  const canAutoAdvance = total > 1 && !paused && !reducedMotion
  const slideToken = `${index}:${content}:${durationMs}`
  const [countdownSlide, setCountdownSlide] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(SUMMARY_SLIDE_MS / 1000)
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

  useLayoutEffect(() => {
    const viewport = bodyRef.current
    const article = articleRef.current
    const slideChanged = seenSlideRef.current !== slideToken
    seenSlideRef.current = slideToken
    const crawling = content === 'full' && canAutoAdvance
    // overflow:hidden is still a scroll container. Writing scrollTop, or letting
    // a long message become one, makes Safari and Chrome leave fullscreen.
    const locked = scrollLockRef.current || Boolean(document.fullscreenElement)

    if (slideChanged) {
      paintProgress(0)
      if (article) article.style.transform = ''
      if (!locked && viewport && viewport.scrollTop !== 0) viewport.scrollTop = 0
    } else if (!crawling && viewport && article && !locked) {
      // Windowed pause can hand the offset to native scroll so the rest of the message stays readable.
      const y = readTranslateY(article)
      if (y < -0.5) {
        article.style.transform = ''
        viewport.scrollTop = -y
      }
    } else if (crawling && viewport && article) {
      if (!locked && viewport.scrollTop !== 0) viewport.scrollTop = 0
      const distance = Math.max(0, article.offsetHeight - viewport.clientHeight)
      distanceRef.current = distance
      const y = -distance * crawlRatio(progressRef.current, durationMs)
      article.style.transform = `translate3d(0, ${y}px, 0)`
    }

    crawlingRef.current = crawling
  }, [canAutoAdvance, content, durationMs, fullscreen, paintProgress, slideToken])

  useLayoutEffect(() => {
    const viewport = bodyRef.current
    const article = articleRef.current
    if (!viewport || !article || content !== 'full') return

    const measure = () => {
      distanceRef.current = Math.max(0, article.offsetHeight - viewport.clientHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(article)
    return () => observer.disconnect()
  }, [content, slideToken, textStep])

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
      const article = articleRef.current
      if (article && content === 'full' && crawlingRef.current) {
        // Transform instead of scrollTop: scroll events drop browser fullscreen,
        // and scrollTop snaps to whole pixels so a slow crawl looks jagged.
        const y = -distanceRef.current * crawlRatio(ratio, durationMs)
        article.style.transform = `translate3d(0, ${y}px, 0)`
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
    const onFullscreen = () => {
      const active = Boolean(document.fullscreenElement)
      scrollLockRef.current = active
      setFullscreen(active)
      document.documentElement.classList.toggle('slideshow-scroll-lock', active)
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen)
      scrollLockRef.current = false
      document.documentElement.classList.remove('slideshow-scroll-lock')
    }
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const keepDocumentStill = (event: Event) => {
      event.preventDefault()
    }
    window.addEventListener('wheel', keepDocumentStill, { passive: false })
    window.addEventListener('touchmove', keepDocumentStill, { passive: false })
    return () => {
      window.removeEventListener('wheel', keepDocumentStill)
      window.removeEventListener('touchmove', keepDocumentStill)
    }
  }, [fullscreen])

  const changeTextSize = useCallback((delta: number) => {
    const next = Math.min(textScales.length - 1, Math.max(0, readTextStep() + delta))
    publishTextStep(next)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const target = rootRef.current
    if (!target) return
    try {
      if (document.fullscreenElement) {
        scrollLockRef.current = false
        await document.exitFullscreen()
      } else {
        const viewport = bodyRef.current
        const article = articleRef.current
        if (viewport && article && viewport.scrollTop > 0) {
          article.style.transform = `translate3d(0, ${-viewport.scrollTop}px, 0)`
          viewport.scrollTop = 0
        }
        scrollLockRef.current = true
        document.documentElement.classList.add('slideshow-scroll-lock')
        flushSync(() => setFullscreen(true))
        await target.requestFullscreen()
      }
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    } catch {
      scrollLockRef.current = false
      document.documentElement.classList.remove('slideshow-scroll-lock')
      setFullscreen(false)
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
      } else if (document.fullscreenElement && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
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
  const countdown = !reducedMotion && !paused && total > 1

  return (
    <div ref={rootRef} className={`slideshow${idle ? ' is-idle' : ''}${fullscreen ? ' is-fullscreen' : ''}`} style={{ '--slide-scale': textScales[textStep] } as CSSProperties}>
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
            <div className={`slide-body${canAutoAdvance || (paused && fullscreen) ? ' is-crawling' : ''}`} ref={bodyRef}>
              <div className="slide-article" ref={articleRef}>
                {fullBody ? <MessageBody markdown={message.body} /> : <p>{message.briefing}</p>}
              </div>
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
              <span className="slide-countdown">Next in {pad(secondsLeft)} seconds</span>
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
