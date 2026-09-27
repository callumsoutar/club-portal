import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  getSupabasePublicKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/flight/supabase/config";

/**
 * Request-scoped Supabase client that reads and refreshes the auth cookie.
 * Use this for anything that should respect RLS as the signed-in user.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublicKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The proxy refreshes the session instead, so this is safe to skip.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only ever call this from server code that has already authorised the caller,
 * or from paths that are deliberately public-but-constrained (guest submission,
 * notification dispatch).
 */
export function createServiceSupabase() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
