export type SupabasePublicEnv = {
  url: string
  publishableKey: string
}

function readPublicEnv(name: string): string | undefined {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    return undefined
  }
  return value
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = readPublicEnv('NEXT_PUBLIC_SUPABASE_URL')
  const publishableKey = readPublicEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  if (!url || !publishableKey) {
    return null
  }

  return { url, publishableKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv()

  if (!env) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return env
}
