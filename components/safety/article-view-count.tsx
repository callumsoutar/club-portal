'use client'

import { useEffect, useState } from 'react'

import { recordSafetyArticleView } from '@/app/(portal)/safety/actions'
import { formatViewCount } from '@/lib/safety-messages'

const RECENT_VIEW_MS = 2000

/** One in-flight record per article, shared across a strict-mode remount. */
const pendingViews = new Map<string, Promise<number | null>>()

function recordOnce(slug: string) {
  const existing = pendingViews.get(slug)
  if (existing) return existing

  const key = `safety-article-view:${slug}`
  let recent = false
  try {
    const last = Number(sessionStorage.getItem(key) || 0)
    recent = Number.isFinite(last) && Date.now() - last < RECENT_VIEW_MS
    if (!recent) sessionStorage.setItem(key, String(Date.now()))
  } catch {
    // Private browsing can block sessionStorage. Still record the view.
  }

  const pending = recent ? Promise.resolve(null) : recordSafetyArticleView(slug)
  pendingViews.set(slug, pending)
  void pending.finally(() => {
    window.setTimeout(() => pendingViews.delete(slug), RECENT_VIEW_MS)
  })
  return pending
}

/**
 * Shows the article's view total and records this opening once the page is
 * actually shown. Prefetch does not run this effect, so browsing the list
 * does not count as a view.
 */
export function ArticleViewCount({
  slug,
  initialCount,
}: {
  slug: string
  initialCount: number
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    let active = true
    void recordOnce(slug).then((next) => {
      if (active && next !== null) setCount(next)
    })
    return () => {
      active = false
    }
  }, [slug])

  return <span>{formatViewCount(count)}</span>
}
