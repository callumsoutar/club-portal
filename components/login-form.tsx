'use client'

import { useState, useTransition, type FormEvent } from 'react'

import { signIn } from '@/app/login/actions'
import { AuthDivider, GoogleSignInButton } from '@/components/google-sign-in-button'

export function LoginForm({ nextPath, initialError }: { nextPath: string; initialError?: string | null }) {
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
    <div className="login-auth">
      <GoogleSignInButton nextPath={nextPath || undefined} onError={setError} />
      <AuthDivider />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" inputMode="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="admin-primary" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
