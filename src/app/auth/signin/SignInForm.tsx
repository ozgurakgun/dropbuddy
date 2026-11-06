'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const result = await signIn('credentials', {
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
      redirect: false,
    })

    setPending(false)

    if (result?.error) {
      setError('Invalid email or password.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="muted">
        <Link href="/auth/forgot-password">Forgot password?</Link>
      </p>
    </>
  )
}
