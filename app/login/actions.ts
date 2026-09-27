'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { safeNextPath } from '@/lib/auth'
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

  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (roleError || !role) {
    await supabase.auth.signOut()
    return { error: 'This account is not an admin.' }
  }

  redirect(safeNextPath(parsed.data.nextPath))
}
