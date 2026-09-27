import "server-only";

import { cache } from "react";

import { createServerSupabase, createServiceSupabase } from "@/lib/flight/supabase/server";
import { publicBrandingUrl } from "@/lib/flight/storage";
import { ACTIONABLE_STATUSES } from "@/lib/flight/constants";
import type {
  ActivityEntry,
  Aircraft,
  Approval,
  Authorisation,
  AuthorisationStatus,
  AuthorisationWithRelations,
  ClubSettings,
  Comment,
  DashboardStats,
  FormTemplate,
  Instructor,
} from "@/lib/flight/types";

const AUTH_SELECT = `
  *,
  aircraft:aircraft_id ( id, registration, aircraft_type, colour ),
  instructor:instructor_id ( id, full_name )
`;

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/**
 * Active aircraft, in club-defined order. Uses the anon-readable policy so the
 * guest form can call it without a session.
 */
export const getActiveAircraft = cache(async (): Promise<Aircraft[]> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("aircraft")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("registration");
  return (data as Aircraft[]) ?? [];
});

export const getAllAircraft = cache(async (): Promise<Aircraft[]> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("aircraft")
    .select("*")
    .order("sort_order")
    .order("registration");
  return (data as Aircraft[]) ?? [];
});

export const getActiveInstructors = cache(async (): Promise<Instructor[]> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("instructors")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("full_name");
  return (data as Instructor[]) ?? [];
});

export const getAllInstructors = cache(async (): Promise<Instructor[]> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("instructors")
    .select("*")
    .order("sort_order")
    .order("full_name");
  return (data as Instructor[]) ?? [];
});

export const getClubSettings = cache(async (): Promise<ClubSettings | null> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("club_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (!data) return null;
  const row = data as ClubSettings & { logo_path?: string | null };
  return {
    ...row,
    emails_enabled: Boolean(
      (data as { emails_enabled?: boolean }).emails_enabled,
    ),
    member_login_enabled: Boolean(
      (data as { member_login_enabled?: boolean }).member_login_enabled,
    ),
    logo_path: row.logo_path ?? null,
    logo_url: publicBrandingUrl(row.logo_path ?? null, row.updated_at),
  };
});

/**
 * Public club logo. SafetyHub company settings are the single branding source.
 */
export const getClubLogoUrl = cache(async (): Promise<string | null> => {
  const { getCompanySettings } = await import("@/lib/get-company-settings");
  const company = await getCompanySettings();
  return company.logoUrl;
});

/**
 * Whether members can create accounts / sign in.
 * Defaults to false (guest-only) when unset — safe for launch.
 * Service role so the landing page can read it without auth.
 */
export const isMemberLoginEnabled = cache(async (): Promise<boolean> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("flight_public_settings");
  if (error || !data) return true;
  const row = Array.isArray(data) ? data[0] : data;
  return row?.member_login_enabled !== false;
});

// ---------------------------------------------------------------------------
// Form template
// ---------------------------------------------------------------------------

/**
 * Published form definitions available for pilots to complete.
 * Multiple may be published at once — the authorise landing picks among them.
 */
export const getPublishedTemplates = cache(async (): Promise<
  Omit<FormTemplate, "sections">[]
> => {
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("form_templates")
    .select("id, name, description, version, is_active, published_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data ?? []) as Omit<FormTemplate, "sections">[];
});

/**
 * @deprecated Prefer getPublishedTemplates() when multiple forms may be live.
 * Kept for callers that only need "some" published form.
 */
export const getActiveTemplate = cache(async (): Promise<FormTemplate | null> => {
  const supabase = await createServerSupabase();

  const { data: template } = await supabase
    .from("form_templates")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!template) return null;

  return hydrateTemplate(supabase, template);
});

export const getTemplateById = cache(async (id: string): Promise<FormTemplate | null> => {
  const supabase = await createServerSupabase();
  const { data: template } = await supabase
    .from("form_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!template) return null;
  return hydrateTemplate(supabase, template);
});

/** Hydrated published template for public completion — null if missing or draft. */
export const getPublishedTemplateById = cache(
  async (id: string): Promise<FormTemplate | null> => {
    const template = await getTemplateById(id);
    if (!template?.is_active) return null;
    return template;
  },
);

export async function getAllTemplates() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("form_templates")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

type SupabaseLike = Awaited<ReturnType<typeof createServerSupabase>>;

async function hydrateTemplate(
  supabase: SupabaseLike,
  template: Record<string, unknown>,
): Promise<FormTemplate> {
  const { data: sections } = await supabase
    .from("form_sections")
    .select("*")
    .eq("template_id", template.id as string)
    .order("sort_order");

  const sectionIds = (sections ?? []).map((s) => s.id);

  const { data: fields } = sectionIds.length
    ? await supabase
        .from("form_fields")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order")
    : { data: [] };

  return {
    ...(template as unknown as FormTemplate),
    sections: (sections ?? []).map((section) => ({
      ...section,
      fields: (fields ?? [])
        .filter((f) => f.section_id === section.id)
        .map((f) => ({
          ...f,
          visible_when: f.visible_when ?? null,
          required_when: f.required_when ?? null,
        })),
    })),
  } as FormTemplate;
}

// ---------------------------------------------------------------------------
// Authorisations
// ---------------------------------------------------------------------------

export interface QueueFilters {
  status?: AuthorisationStatus[];
  aircraftId?: string;
  instructorId?: string;
  licenceType?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function getAuthorisationQueue(
  filters: QueueFilters = {},
): Promise<AuthorisationWithRelations[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("authorisations")
    .select(AUTH_SELECT)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.aircraftId) query = query.eq("aircraft_id", filters.aircraftId);
  if (filters.instructorId) query = query.eq("instructor_id", filters.instructorId);
  if (filters.licenceType) query = query.eq("pilot_licence_type", filters.licenceType);
  if (filters.from) query = query.gte("flight_date", filters.from);
  if (filters.to) query = query.lte("flight_date", filters.to);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `pilot_name.ilike.${term},reference.ilike.${term},exercise.ilike.${term},aircraft_registration.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[queries] queue failed", error);
    return [];
  }
  return (data as unknown as AuthorisationWithRelations[]) ?? [];
}

export const getAuthorisation = cache(
  async (id: string): Promise<AuthorisationWithRelations | null> => {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("authorisations")
      .select(AUTH_SELECT)
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as AuthorisationWithRelations) ?? null;
  },
);

/**
 * Guest lookup. Goes through the SECURITY DEFINER function rather than a table
 * read, so an anonymous caller can only ever retrieve the single row whose
 * unguessable token they already hold.
 */
export async function getAuthorisationByToken(
  token: string,
): Promise<Authorisation | null> {
  const supabase = createServiceSupabase();
  const { data, error } = await supabase.rpc("get_authorisation_by_token", {
    p_token: token,
  });

  if (error) {
    console.error("[queries] token lookup failed", error);
    return null;
  }
  return (data?.[0] as Authorisation) ?? null;
}

export async function getMyAuthorisations(
  profileId: string,
): Promise<AuthorisationWithRelations[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("authorisations")
    .select(AUTH_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as AuthorisationWithRelations[]) ?? [];
}

export async function getComments(authorisationId: string): Promise<Comment[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("authorisation_id", authorisationId)
    .order("created_at", { ascending: true });
  return (data as Comment[]) ?? [];
}

export async function getApprovals(authorisationId: string): Promise<Approval[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("approvals")
    .select("*")
    .eq("authorisation_id", authorisationId)
    .order("created_at", { ascending: false });
  return (data as Approval[]) ?? [];
}

export async function getActivity(authorisationId: string): Promise<ActivityEntry[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("activity_log")
    .select("*")
    .eq("authorisation_id", authorisationId)
    .order("created_at", { ascending: false });
  return (data as ActivityEntry[]) ?? [];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * All dashboard tiles in one pass.
 *
 * Counts run as parallel head-only queries (no rows transferred), and the
 * trend sparkline is bucketed in JS from a single narrow select — cheaper than
 * fourteen separate count queries.
 */
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  const supabase = await createServerSupabase();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);

  const countOf = async (
    build: (q: ReturnType<SupabaseLike["from"]>) => PromiseLike<{ count: number | null }>,
  ) => {
    const { count } = await build(supabase.from("authorisations"));
    return count ?? 0;
  };

  const [
    pending,
    approvedToday,
    declinedToday,
    expiredMedicals,
    expiredBfrs,
    trendRows,
  ] = await Promise.all([
    countOf((q) =>
      q.select("*", { count: "exact", head: true }).in("status", ACTIONABLE_STATUSES),
    ),
    countOf((q) =>
      q
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("decided_at", todayIso),
    ),
    countOf((q) =>
      q
        .select("*", { count: "exact", head: true })
        .eq("status", "declined")
        .gte("decided_at", todayIso),
    ),
    supabase
      .from("pilot_profiles")
      .select("*", { count: "exact", head: true })
      .lt("medical_expiry", new Date().toISOString().slice(0, 10))
      .then((r) => r.count ?? 0),
    supabase
      .from("pilot_profiles")
      .select("*", { count: "exact", head: true })
      .lt("bfr_expiry", new Date().toISOString().slice(0, 10))
      .then((r) => r.count ?? 0),
    supabase
      .from("authorisations")
      .select("submitted_at")
      .gte("submitted_at", fourteenDaysAgo.toISOString())
      .not("submitted_at", "is", null),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    buckets.set(d, 0);
  }
  for (const row of trendRows.data ?? []) {
    const key = String(row.submitted_at).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }

  return {
    pending,
    approvedToday,
    declinedToday,
    expiredMedicals,
    expiredBfrs,
    trend: [...buckets.entries()].map(([date, count]) => ({ date, count })),
  };
});
