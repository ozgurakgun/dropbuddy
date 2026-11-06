'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setError(null)

    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(form.get('email') || '') }),
    })

    const data = (await response.json().catch(() => ({}))) as { message?: string }
    setPending(false)

    if (!response.ok) {
      setError(data.message || 'Could not send reset email.')
      return
    }

    setMessage(data.message || 'Check your inbox.')
  }

  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Forgot password</h1>
      <p className="muted">We&apos;ll email a reset link if that account exists.</p>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="muted">
        <Link href="/auth/signin">Back to sign in</Link>
      </p>
    </div>
  )
}
