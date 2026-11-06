import { Suspense } from 'react'
import { SignInForm } from './SignInForm'

export default function SignInPage() {
  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Sign in</h1>
      <p className="muted">Use a seeded demo account or your tenant credentials.</p>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
