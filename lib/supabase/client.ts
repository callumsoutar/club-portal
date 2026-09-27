'use client'

import { createBrowserClient } from '@supabase/ssr'

import { requireSupabasePublicEnv } from './env'

export function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv()

  return createBrowserClient(url, publishableKey)
}
