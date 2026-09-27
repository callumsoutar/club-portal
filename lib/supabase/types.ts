/**
 * Placeholder until types are generated from the SafetyHub Supabase project.
 *
 * Once the project exists:
 *   pnpm dlx supabase gen types typescript --project-id <project-id> > lib/supabase/database.types.ts
 *
 * Then pass `Database` to the browser and server clients.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
