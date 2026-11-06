'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type State = 'pending' | 'success' | 'error'

export function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [state, setState] = useState<State>('pending')
  const [message, setMessage] = useState('We are confirming your email…')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('This verification link is invalid or has expired.')
      return
    }

    let cancelled = false

    async function verify() {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await response.json().catch(() => ({}))) as { message?: string }
      if (cancelled) return

      if (!response.ok) {
        setState('error')
        setMessage(data.message || 'This verification link is invalid or has expired.')
        return
      }

      setState('success')
      setMessage(data.message || 'Email verified successfully. You can now sign in.')
    }

    verify().catch(() => {
      if (!cancelled) {
        setState('error')
        setMessage('An error occurred during verification.')
      }
    })

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <>
      {state === 'pending' ? <p className="muted">{message}</p> : null}
      {state === 'success' ? <p className="success">{message}</p> : null}
      {state === 'error' ? <p className="error">{message}</p> : null}
      <p className="muted">
        <Link href="/auth/signin">Go to sign in</Link>
      </p>
    </>
  )
}
