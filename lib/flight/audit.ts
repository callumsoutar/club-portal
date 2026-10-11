import "server-only";

import { createServiceSupabase } from "@/lib/flight/supabase/server";

interface AuditInput {
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * The admin audit log has been removed. Call sites stay so existing actions
 * don't need a second rewrite; nothing is written.
 */
export async function audit(_input: AuditInput): Promise<void> {}

interface ActivityInput {
  authorisationId: string;
  actorId?: string | null;
  actorLabel?: string | null;
  verb: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

/** Pilot-facing timeline entry on an authorisation. */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const supabase = createServiceSupabase();
    await supabase.from("activity_log").insert({
      authorisation_id: input.authorisationId,
      actor_id: input.actorId ?? null,
      actor_label: input.actorLabel ?? null,
      verb: input.verb,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[activity] failed to write entry", input.verb, err);
  }
}

export function getClientIp(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

/**
 * Durable, database-backed rate limiter.
 *
 * Deliberately not in-memory: guest submission is an unauthenticated write
 * path, and serverless instances don't share memory, so an in-process counter
 * would provide no real protection.
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  max: number,
  windowMinutes: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createServiceSupabase();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("identifier", identifier)
    .gte("created_at", since);

  const used = count ?? 0;
  if (used >= max) return { allowed: false, remaining: 0 };

  await supabase.from("rate_limits").insert({ bucket, identifier });
  return { allowed: true, remaining: max - used - 1 };
}
