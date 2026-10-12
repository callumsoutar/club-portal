"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/flight/ui/button";
import {
  resendSignupCode,
  sendSignupCode,
  type SignupCodeType,
} from "@/lib/flight/actions/signup";
import { AuthDivider, GoogleSignInButton } from "@/components/google-sign-in-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/flight/ui/field";
import { Input } from "@/components/flight/ui/input";
import { createClient } from "@/lib/flight/supabase/client";
import { cn } from "@/lib/flight/utils";
import type { AppRole } from "@/lib/flight/types";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").optional(),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function AuthForm({
  mode,
  className,
  memberLoginEnabled = true,
}: {
  mode: "login" | "signup";
  className?: string;
  /** When false, only staff may complete login; signup should be blocked upstream. */
  memberLoginEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<{
    email: string;
    verificationType: SignupCodeType;
    codeLength: number;
  } | null>(null);
  const [code, setCode] = useState("");
  const isSignup = mode === "signup";
  const staffOnly = !memberLoginEnabled;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      // Name is only required when creating an account.
      isSignup ? schema.required({ full_name: true }) : schema.omit({ full_name: true }),
    ),
  });

  function nextPath() {
    const requested = searchParams.get("next");
    return requested?.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.includes("\\")
      ? requested
      : "/";
  }

  async function continueSignedIn(
    supabase: ReturnType<typeof createClient>,
    userId: string | undefined,
  ) {
    if (!userId) {
      setPending(false);
      toast.error("Couldn't verify your account. Try again.");
      return;
    }

    if (!memberLoginEnabled) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const role = (profile?.role ?? "member") as AppRole;
      if (role === "member") {
        await supabase.auth.signOut();
        setPending(false);
        toast.error(
          "Member login is turned off. Use guest authorisation, or sign in with a staff account.",
        );
        return;
      }
    }

    router.push(nextPath());
    router.refresh();
  }

  async function onSubmit(values: FormValues) {
    setPending(true);
    const supabase = createClient();

    if (isSignup && !memberLoginEnabled) {
      setPending(false);
      toast.error("Member accounts are not open yet. Continue as a guest.");
      return;
    }

    if (isSignup) {
      const result = await sendSignupCode({
        fullName: values.full_name ?? "",
        email: values.email,
        password: values.password,
        origin: window.location.origin,
        next: searchParams.get("next"),
      });
      setPending(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCode("");
      setConfirming({
        email: values.email.trim().toLowerCase(),
        verificationType: result.verificationType,
        codeLength: result.codeLength,
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const unconfirmed =
        error.code === "email_not_confirmed" || /not confirmed/i.test(error.message);
      if (unconfirmed) {
        const sent = await resendSignupCode({
          email: values.email,
          origin: window.location.origin,
          next: searchParams.get("next"),
        });
        setPending(false);
        if (!sent.ok) {
          toast.error(sent.error);
          return;
        }
        setCode("");
        setConfirming({
          email: values.email.trim().toLowerCase(),
          verificationType: sent.verificationType,
          codeLength: sent.codeLength,
        });
        return;
      }

      setPending(false);
      toast.error(error.message);
      return;
    }

    await continueSignedIn(supabase, data.user?.id);
  }

  async function onConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!confirming) return;

    const token = code.replace(/\D/g, "");
    if (token.length !== confirming.codeLength) {
      toast.error(`Enter the ${confirming.codeLength}-digit code from the email.`);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: confirming.email,
      token,
      type: confirming.verificationType,
    });

    if (error) {
      setPending(false);
      toast.error(error.message);
      return;
    }

    await continueSignedIn(supabase, data.user?.id);
  }

  async function onResend() {
    if (!confirming) return;
    setPending(true);
    const result = await resendSignupCode({
      email: confirming.email,
      origin: window.location.origin,
      next: searchParams.get("next"),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCode("");
    setConfirming({
      email: confirming.email,
      verificationType: result.verificationType,
      codeLength: result.codeLength,
    });
    toast.success("A new code is on its way.");
  }

  if (confirming) {
    return (
      <form onSubmit={onConfirm} className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-balance text-muted-foreground">
              We sent {confirming.codeLength === 8 ? "an" : "a"} {confirming.codeLength}-digit code to{" "}
              <span className="font-medium text-foreground">{confirming.email}</span>.
              Enter it here, or use the link in the email.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="signup-code">Confirmation code</FieldLabel>
            <Input
              id="signup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={confirming.codeLength}
              placeholder={"0".repeat(confirming.codeLength)}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, confirming.codeLength))
              }
              className="h-14 text-center text-2xl tracking-[0.4em] font-semibold"
            />
          </Field>

          <Field>
            <Button
              type="submit"
              size="lg"
              disabled={pending || code.length !== confirming.codeLength}
              className="w-full"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirm email
            </Button>
          </Field>

          <FieldDescription className="text-center">
            <button
              type="button"
              className="underline underline-offset-4 disabled:opacity-50"
              disabled={pending}
              onClick={onResend}
            >
              Resend code
            </button>
            {" · "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                setConfirming(null);
                setCode("");
              }}
            >
              Use a different email
            </button>
          </FieldDescription>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup
              ? "Create your account"
              : staffOnly
                ? "Staff sign in"
                : "Welcome back"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {isSignup
              ? "Your pilot details are saved, so your next authorisation fills itself in."
              : staffOnly
                ? "Instructors and admins only. Pilots authorise as guests."
                : "Sign in to see your history and skip the form filling."}
          </p>
        </div>

        <GoogleSignInButton
          nextPath={searchParams.get("next") ?? undefined}
          onError={(message) => toast.error(message)}
        />
        <AuthDivider className="my-1" />

        {isSignup && (
          <Field data-invalid={Boolean(errors.full_name) || undefined}>
            <FieldLabel htmlFor="full_name">Full name</FieldLabel>
            <Input
              id="full_name"
              autoComplete="name"
              placeholder="Alex Whitfield"
              className="h-11"
              aria-invalid={Boolean(errors.full_name)}
              {...register("full_name")}
            />
            <FieldError>{errors.full_name?.message}</FieldError>
          </Field>
        )}

        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.password) || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="h-11"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        <Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </Field>

        {memberLoginEnabled ? (
          <FieldDescription className="text-center">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="underline underline-offset-4"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </FieldDescription>
        ) : null}

        <FieldDescription className="text-center">
          <Link href="/authorise" className="underline underline-offset-4">
            Continue as a guest instead
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
