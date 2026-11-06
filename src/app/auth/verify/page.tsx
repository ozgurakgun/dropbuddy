import { Suspense } from 'react'
import { VerifyEmailClient } from './VerifyEmailClient'

export default function VerifyEmailPage() {
  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Verify your email</h1>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <VerifyEmailClient />
      </Suspense>
    </div>
  )
}
