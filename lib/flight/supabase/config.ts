/**
 * Resolves and validates Supabase credentials.
 *
 * Supports both the new API keys (publishable / secret) and the legacy
 * anon / service_role names so the app works against either vintage of
 * dashboard. Prefer publishable + secret once you've rotated JWT signing keys.
 *
 * Asymmetric JWT verification needs no extra env vars — `getClaims()` discovers
 * public keys from `{NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 *
 * The non-null assertions these replace turned a missing variable into an
 * opaque failure deep inside the client library. Failing here instead names
 * the exact variable that's missing.
 */

const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL"] as const;

const PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only for literal,
 * statically analysable member expressions — `process.env[someVariable]` is
 * NOT replaced and reads as undefined in the browser. Hence the explicit map
 * rather than a dynamic lookup.
 */
const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

function firstOf(names: readonly string[], label: string): string {
  for (const name of names) {
    const value = PUBLIC_ENV[name]?.trim();
    if (value) return value;
  }

  throw new Error(
    `Missing ${label}. Set ${names.join(" or ")} in .env.local, ` +
      `then restart the dev server — Next.js only reads env files at startup.`,
  );
}

export function getSupabaseUrl(): string {
  return firstOf(URL_KEYS, "your Supabase project URL");
}

export function getSupabasePublicKey(): string {
  return firstOf(PUBLIC_KEYS, "your Supabase publishable (anon) key");
}

/** Server-only. Bypasses RLS, so it must never be bundled for the browser. */
export function getSupabaseSecretKey(): string {
  const value =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!value) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) — " +
        "required for privileged server operations (submissions, approvals, " +
        "notifications). Find it under Project Settings → API.",
    );
  }

  return value;
}
