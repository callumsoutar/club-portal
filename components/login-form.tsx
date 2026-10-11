'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'

import { signIn } from '@/app/login/actions'
import { Button } from '@/components/flight/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/flight/ui/field'
import { Input } from '@/components/flight/ui/input'
import { AuthDivider, GoogleSignInButton } from '@/components/google-sign-in-button'

export function LoginForm({
  nextPath,
  initialError,
  companyName,
  memberLoginEnabled,
}: {
  nextPath: string
  initialError?: string | null
  companyName: string
  memberLoginEnabled: boolean
}) {
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [pending, startTransition] = useTransition()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await signIn({
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        nextPath,
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {memberLoginEnabled
              ? `Welcome back to the ${companyName} portal.`
              : 'Instructors and club admins only. Pilots can authorise a flight without signing in.'}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-danger-muted px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <GoogleSignInButton nextPath={nextPath || undefined} onError={setError} />
        <AuthDivider className="my-1" />

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@example.com"
            className="h-11"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-11"
            required
          />
        </Field>

        <Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </Field>

        {memberLoginEnabled ? (
          <FieldDescription className="text-center">
            New here?{' '}
            <Link href="/signup" className="underline underline-offset-4">
              Create an account
            </Link>
          </FieldDescription>
        ) : null}

        <FieldDescription className="text-center">
          <Link href="/authorise" className="underline underline-offset-4">
            Authorise a flight without an account
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
