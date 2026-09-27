"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessionUser } from "@/lib/flight/auth";
import { createServerSupabase, createServiceSupabase } from "@/lib/flight/supabase/server";
import type { ActionResult } from "@/lib/flight/actions/authorisations";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  licence_type: z
    .enum(["student", "rpl", "ppl", "cpl", "atpl", "instructor"])
    .optional()
    .or(z.literal("")),
  licence_number: z.string().trim().max(40).optional().or(z.literal("")),
  bfr_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  medical_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  preferred_aircraft_id: z.string().uuid().optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  emergency_contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
});

/**
 * Save the pilot's profile. Everything here is a smart default for the next
 * authorisation — this is what makes the 30-second submission possible.
 */
export async function updateProfile(
  raw: z.input<typeof profileSchema>,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const v = parsed.data;
  const supabase = createServiceSupabase();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: v.full_name, phone: v.phone || null })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: "Couldn't save your details." };

  const { error: pilotError } = await supabase.from("pilot_profiles").upsert(
    {
      profile_id: user.id,
      licence_type: v.licence_type || null,
      licence_number: v.licence_number || null,
      bfr_expiry: v.bfr_expiry || null,
      medical_expiry: v.medical_expiry || null,
      preferred_aircraft_id: v.preferred_aircraft_id || null,
      emergency_contact_name: v.emergency_contact_name || null,
      emergency_contact_phone: v.emergency_contact_phone || null,
    },
    { onConflict: "profile_id" },
  );

  if (pilotError) return { ok: false, error: "Couldn't save your pilot details." };

  revalidatePath("/fly");
  revalidatePath("/fly/profile");
  revalidatePath("/authorise");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
