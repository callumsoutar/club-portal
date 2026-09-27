import "server-only";

import { headers } from "next/headers";

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
 * Forensic log. Never throws — an audit failure must not roll back the
 * operation the user actually asked for, but it does get surfaced in the
 * server logs so it can't fail silently forever.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const supabase = createServiceSupabase();
    const h = await headers();

    await supabase.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      actor_label: input.actorLabel ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ip_address: getClientIp(h) ?? null,
      user_agent: h.get("user-agent"),
    });
  } catch (err) {
    console.error("[audit] failed to write entry", input.action, err);
  }
}

interface ActivityInput {
  authorisationId: string;
  actorId?: string | null;
  actorLabel?: string | null;
  verb: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

/** User-facing timeline entry. Distinct from `audit` — this one is read by pilots. */
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
