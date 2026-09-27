'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { landingPath, safeNextPath } from '@/lib/auth'
import { isMemberLoginEnabled } from '@/lib/flight/queries'
import type { AppRole } from '@/lib/flight/types'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Enter your password'),
  nextPath: z.string().optional(),
})

export async function signIn(input: { email: string; password: string; nextPath?: string }) {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return { error: 'Email or password is incorrect.' }
  }

  const [{ data: roleRow }, { data: profile }, memberLoginEnabled] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle(),
    supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle(),
    isMemberLoginEnabled(),
  ])

  const flightRole = (profile?.role ?? null) as AppRole | null
  if (!memberLoginEnabled && flightRole === 'member' && !roleRow) {
    await supabase.auth.signOut()
    return { error: 'Member login is turned off. You can still submit a guest authorisation.' }
  }

  const destination = landingPath({
    nextPath: safeNextPath(parsed.data.nextPath),
    safetyAdmin: Boolean(roleRow),
    flightRole,
  })

  if (!destination) {
    await supabase.auth.signOut()
    return { error: 'This account does not have access yet.' }
  }

  redirect(destination)
}
