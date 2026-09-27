'use client'

import { useState, useTransition, type FormEvent } from 'react'

import { signIn } from '@/app/login/actions'

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState<string | null>(null)
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
    <form className="login-form" onSubmit={onSubmit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" inputMode="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="admin-primary" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
