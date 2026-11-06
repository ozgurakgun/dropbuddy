'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { PASSWORD_REQUIREMENTS, validateEmail, validatePassword } from '@/lib/auth-validation'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showRequirements, setShowRequirements] = useState(false)

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
      uppercase: PASSWORD_REQUIREMENTS.uppercase.test(password),
      lowercase: PASSWORD_REQUIREMENTS.lowercase.test(password),
      number: PASSWORD_REQUIREMENTS.number.test(password),
      special: PASSWORD_REQUIREMENTS.special.test(password),
    }),
    [password],
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long')
      return
    }
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setPending(true)
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = (await response.json().catch(() => ({}))) as { message?: string }
    setPending(false)

    if (!response.ok) {
      setError(data.message || 'Something went wrong')
      return
    }

    setSuccess(data.message || 'Account created. Check your email to verify.')
    setName('')
    setEmail('')
    setPassword('')
  }

  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Create account</h1>
      <p className="muted">Sign up with email. We&apos;ll send a verification link before you can sign in.</p>
      <form onSubmit={onSubmit}>
        <label>
          Name
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={() => setShowRequirements(true)}
            autoComplete="new-password"
            required
          />
        </label>
        {showRequirements ? (
          <ul className="password-reqs">
            <li className={passwordChecks.minLength ? 'ok' : ''}>At least 8 characters</li>
            <li className={passwordChecks.uppercase ? 'ok' : ''}>One uppercase letter</li>
            <li className={passwordChecks.lowercase ? 'ok' : ''}>One lowercase letter</li>
            <li className={passwordChecks.number ? 'ok' : ''}>One number</li>
            <li className={passwordChecks.special ? 'ok' : ''}>One special character</li>
          </ul>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link href="/auth/signin">Sign in</Link>
      </p>
    </div>
  )
}
