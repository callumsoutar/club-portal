export type SupabasePublicEnv = {
  url: string
  publishableKey: string
}

function readLiteral(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  // Next.js only inlines NEXT_PUBLIC_* when the access is a literal
  // `process.env.NAME`. A dynamic `process.env[name]` is undefined in the browser.
  const url = readLiteral(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const publishableKey =
    readLiteral(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    readLiteral(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
