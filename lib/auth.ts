import 'server-only'

import { cache } from 'react'

import { isMemberLoginEnabled } from '@/lib/flight/queries'
import type { AppRole } from '@/lib/flight/types'
import { createClient } from '@/lib/supabase/server'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export async function resolveSignedInDestination(
  supabase: ServerSupabase,
  userId: string,
  nextPath: string | null,
): Promise<{ destination: string } | { error: 'member_disabled' | 'no_access' }> {
  const [{ data: roleRow }, { data: profile }, memberLoginEnabled] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    isMemberLoginEnabled(),
  ])

  const flightRole = (profile?.role ?? null) as AppRole | null
  if (!memberLoginEnabled && flightRole === 'member' && !roleRow) {
    return { error: 'member_disabled' }
  }

  const destination = landingPath({
    nextPath,
    safetyAdmin: Boolean(roleRow),
    flightRole,
  })

  if (!destination) return { error: 'no_access' }
  return { destination }
}

export const getAdminUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (error) {
    throw new Error(`Could not check admin access: ${error.message}`)
  }

  if (!data) return null
  return user
})

export function landingPath(input: {
  nextPath: string | null
  safetyAdmin: boolean
  flightRole: 'member' | 'instructor' | 'admin' | null
}) {
  const { nextPath, safetyAdmin, flightRole } = input
  const flightAdmin = flightRole === 'admin'
  const adminNext = nextPath === '/admin' || nextPath?.startsWith('/admin/') || nextPath === '/tv' || nextPath?.startsWith('/tv?')
  const flightNext = nextPath === '/fly' || nextPath?.startsWith('/fly/') || nextPath === '/authorise' || nextPath?.startsWith('/authorise/') || nextPath?.startsWith('/a/')

  if (nextPath && adminNext && (safetyAdmin || flightAdmin)) return nextPath
  if (nextPath && flightNext && flightRole) return nextPath
  if (safetyAdmin) return '/admin'
  if (flightRole) return '/fly'
  return null
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }
  const allowed =
    value === '/tv' ||
    value.startsWith('/tv?') ||
    value === '/admin' ||
    value.startsWith('/admin/') ||
    value === '/fly' ||
    value.startsWith('/fly/') ||
    value === '/authorise' ||
    value.startsWith('/authorise/') ||
    value.startsWith('/a/')
  return allowed ? value : null
}
