import { Suspense } from 'react'
import { SetPasswordForm } from './SetPasswordForm'

export default function SetPasswordPage() {
  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Set password</h1>
      <p className="muted">Choose a password to finish activating your DropBuddy account.</p>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SetPasswordForm />
      </Suspense>
    </div>
  )
}
