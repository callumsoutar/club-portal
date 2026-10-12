import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { resolveSignedInDestination, safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "magiclink"]);

function appOrigin(request: Request) {
  const { origin } = new URL(request.url);
  if (process.env.NODE_ENV === "development") return origin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost)) {
    return `https://${forwardedHost}`;
  }

  return origin;
}

function loginError(request: Request, error: "member_disabled" | "no_access" | "oauth") {
  const url = new URL("/login", appOrigin(request));
  url.searchParams.set("error", error);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/** Confirm a signup from the email link, then start a session. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !OTP_TYPES.has(type)) {
    return loginError(request, "oauth");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.user) return loginError(request, "oauth");

  const result = await resolveSignedInDestination(
    supabase,
    data.user.id,
    safeNextPath(searchParams.get("next")),
  );

  if ("error" in result) {
    await supabase.auth.signOut();
    return loginError(request, result.error);
  }

  return NextResponse.redirect(new URL(result.destination, appOrigin(request)));
}
