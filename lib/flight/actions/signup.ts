"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/flight/audit";
import { isMemberLoginEnabled } from "@/lib/flight/queries";
import { signupCodeEmail } from "@/lib/flight/notifications/templates";
import { createServiceSupabase } from "@/lib/flight/supabase/server";

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72);

export type SignupCodeType = "signup" | "magiclink";

type SendResult =
  | { ok: true; verificationType: SignupCodeType; codeLength: number }
  | { ok: false; error: string };

/**
 * Create an email account and mail a 6-digit code.
 * Supabase's own confirm message is only a link, so this sends the code
 * through the club's mail provider and keeps the link as a fallback.
 */
export async function sendSignupCode(raw: {
  fullName: string;
  email: string;
  password: string;
  origin: string;
  next?: string | null;
}): Promise<SendResult> {
  if (!(await isMemberLoginEnabled())) {
    return { ok: false, error: "Member accounts are not open yet. Continue as a guest." };
  }

  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Please enter your full name").max(120),
      email: emailSchema,
      password: passwordSchema,
      origin: z.string().url(),
      next: z.string().nullable().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const email = parsed.data.email.toLowerCase();
  const limited = await limitSignup(email);
  if (limited) return limited;

  const supabase = createServiceSupabase();
  const existing = await findUser(email);

  if (existing?.email_confirmed_at) {
    return { ok: false, error: "An account with that email already exists. Sign in instead." };
  }

  if (existing) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: parsed.data.password,
      user_metadata: { full_name: parsed.data.fullName },
    });
    if (passwordError) {
      return { ok: false, error: "Couldn't update that account. Try again." };
    }
  }

  const origin = await allowedOrigin(parsed.data.origin);
  const next = safeNextPath(parsed.data.next);
  const redirectTo = confirmRedirect(origin, next);

  const generated = existing
    ? await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      })
    : await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
          redirectTo,
        },
      });

  if (generated.error || !generated.data?.properties) {
    const message = generated.error?.message?.toLowerCase() ?? "";
    if (message.includes("already")) {
      return { ok: false, error: "An account with that email already exists. Sign in instead." };
    }
    return { ok: false, error: "Couldn't start signup. Try again." };
  }

  const verificationType = generated.data.properties.verification_type;
  if (verificationType !== "signup" && verificationType !== "magiclink") {
    return { ok: false, error: "Couldn't start signup. Try again." };
  }

  const sent = await deliverCode({
    to: email,
    code: generated.data.properties.email_otp,
    tokenHash: generated.data.properties.hashed_token,
    type: verificationType,
    origin,
    next,
  });
  if (!sent.ok) return sent;

  return {
    ok: true,
    verificationType,
    codeLength: generated.data.properties.email_otp.length,
  };
}

/** Mail a fresh code for an account that exists but isn't confirmed yet. */
export async function resendSignupCode(raw: {
  email: string;
  origin: string;
  next?: string | null;
}): Promise<SendResult> {
  const parsed = z
    .object({
      email: emailSchema,
      origin: z.string().url(),
      next: z.string().nullable().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter the email address you signed up with." };
  }

  const email = parsed.data.email.toLowerCase();
  const limited = await limitSignup(email);
  if (limited) return limited;

  const existing = await findUser(email);
  if (!existing) {
    return { ok: false, error: "We couldn't find an account for that email." };
  }
  if (existing.email_confirmed_at) {
    return { ok: false, error: "That email is already confirmed. Sign in instead." };
  }

  const supabase = createServiceSupabase();
  const origin = await allowedOrigin(parsed.data.origin);
  const next = safeNextPath(parsed.data.next);
  const redirectTo = confirmRedirect(origin, next);
  const generated = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (generated.error || !generated.data?.properties) {
    return { ok: false, error: "Couldn't send a new code. Try again." };
  }

  const sent = await deliverCode({
    to: email,
    code: generated.data.properties.email_otp,
    tokenHash: generated.data.properties.hashed_token,
    type: "magiclink",
    origin,
    next,
  });
  if (!sent.ok) return sent;

  return {
    ok: true,
    verificationType: "magiclink",
    codeLength: generated.data.properties.email_otp.length,
  };
}

async function limitSignup(email: string): Promise<SendResult | null> {
  const h = await headers();
  const ip = getClientIp(h) ?? "unknown";
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit("signup-email", email, 5, 15),
    checkRateLimit("signup-ip", ip, 20, 15),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return { ok: false, error: "Too many codes sent. Wait a few minutes and try again." };
  }
  return null;
}

async function findUser(email: string) {
  const supabase = createServiceSupabase();
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

function confirmRedirect(origin: string, next: string | null) {
  const url = new URL("/auth/confirm", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

async function allowedOrigin(requested: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const fromRequest = host ? `${proto}://${host}` : null;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || null;

  let candidate: URL;
  try {
    candidate = new URL(requested);
  } catch {
    return fromRequest || configured || "http://localhost:3000";
  }

  const allowed = [fromRequest, configured].filter(Boolean).map((value) => new URL(value!).origin);
  if (allowed.includes(candidate.origin)) return candidate.origin;
  return fromRequest || configured || candidate.origin;
}

async function deliverCode(input: {
  to: string;
  code: string;
  tokenHash: string;
  type: SignupCodeType;
  origin: string;
  next: string | null;
}): Promise<SendResult | { ok: true }> {
  const link = new URL("/auth/confirm", input.origin);
  link.searchParams.set("token_hash", input.tokenHash);
  link.searchParams.set("type", input.type);
  if (input.next) link.searchParams.set("next", input.next);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: "Email isn't configured, so the code couldn't be sent." };
  }

  const rendered = signupCodeEmail(input.code, link.toString());
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const sender = from.includes("<") ? from.trim() : `Flight Auth <${from.trim()}>`;
  const { error } = await resend.emails.send({
    from: sender,
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
  });

  if (error) {
    console.error("[signup] confirmation email failed", error.message);
    return { ok: false, error: "Couldn't send the confirmation email. Try again." };
  }

  return { ok: true };
}
