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

  async function onSubmit(values: FormValues) {
    setPending(true);
    const supabase = createClient();

    if (isSignup && !memberLoginEnabled) {
      setPending(false);
      toast.error("Member accounts are not open yet. Continue as a guest.");
      return;
    }

    const { data, error } = isSignup
      ? await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { data: { full_name: values.full_name } },
        })
      : await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

    if (error) {
      setPending(false);
      toast.error(error.message);
      return;
    }

    if (!memberLoginEnabled) {
      const userId = data.user?.id;
      if (!userId) {
        setPending(false);
        toast.error("Couldn't verify your account. Try again.");
        return;
      }

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

    // Honour the `next` param the proxy set, so a deep link survives sign-in.
    const next = searchParams.get("next") ?? "/fly";
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignup
              ? "Create your account"
              : staffOnly
                ? "Staff sign in"
                : "Welcome back"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {isSignup
              ? "Then your next authorisation takes about thirty seconds."
              : staffOnly
                ? "Instructors and admins only. Pilots authorise as guests."
                : "Sign in to see your history and skip the form filling."}
          </p>
        </div>

        {isSignup && (
          <Field data-invalid={Boolean(errors.full_name) || undefined}>
            <FieldLabel htmlFor="full_name">Full name</FieldLabel>
            <Input
              id="full_name"
              autoComplete="name"
              placeholder="Alex Whitfield"
              className="h-11 bg-background"
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
            className="h-11 bg-background"
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
            className="h-11 bg-background"
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
