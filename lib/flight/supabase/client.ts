"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/flight/supabase/config";

/**
 * Browser Supabase client. Safe to call repeatedly — @supabase/ssr memoises
 * the underlying instance per set of credentials.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
}
