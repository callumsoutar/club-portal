import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { requireSupabasePublicEnv } from './env'

export async function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv()
  const cookieStore = await cookies()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet, headers) {
        void headers
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes
          // the session, and Server Actions can still set cookies here.
        }
      },
    },
  })
}
