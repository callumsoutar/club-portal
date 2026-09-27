import 'server-only'

import { createClient } from '@/lib/supabase/server'

export async function getAdminUser() {
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
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/admin'
  }
  if (value === '/tv' || value.startsWith('/tv?') || value === '/admin' || value.startsWith('/admin/')) {
    return value
  }
  return '/admin'
}
