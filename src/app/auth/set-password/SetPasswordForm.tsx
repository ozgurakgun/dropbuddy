'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const purpose = searchParams.get('purpose') === 'invite' ? 'invite' : 'reset'
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (password !== confirm) {
      setPending(false)
      setError('Passwords do not match.')
      return
    }

    const response = await fetch('/api/auth/password/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, purpose, password }),
    })

    const data = (await response.json().catch(() => ({}))) as { message?: string }
    setPending(false)

    if (!response.ok) {
      setError(data.message || 'Could not save password.')
      return
    }

    setSuccess(data.message || 'Password saved.')
    setTimeout(() => router.push('/auth/signin'), 1200)
  }

  if (!token) {
    return <p className="error">This link is missing a token.</p>
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label>
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : purpose === 'invite' ? 'Activate account' : 'Reset password'}
      </button>
      <p className="muted">
        <Link href="/auth/signin">Back to sign in</Link>
      </p>
    </form>
  )
}
