import { NextResponse } from 'next/server'

import { resolveSignedInDestination, safeNextPath } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

function appOrigin(request: Request) {
  const { origin } = new URL(request.url)
  if (process.env.NODE_ENV === 'development') return origin

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost)) {
    return `https://${forwardedHost}`
  }

  return origin
}

function loginError(request: Request, error: 'member_disabled' | 'no_access' | 'oauth' | 'exists') {
  const url = new URL('/login', appOrigin(request))
  url.searchParams.set('error', error)
  const next = safeNextPath(new URL(request.url).searchParams.get('next'))
  if (next) url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')

  if (providerError) {
    const exists = /already registered|already exists|identity is already/i.test(providerError)
    return loginError(request, exists ? 'exists' : 'oauth')
  }

  if (!code) return loginError(request, 'oauth')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return loginError(request, 'oauth')

  const result = await resolveSignedInDestination(
    supabase,
    data.user.id,
    safeNextPath(searchParams.get('next')),
  )

  if ('error' in result) {
    await supabase.auth.signOut()
    return loginError(request, result.error)
  }

  return NextResponse.redirect(new URL(result.destination, appOrigin(request)))
}
