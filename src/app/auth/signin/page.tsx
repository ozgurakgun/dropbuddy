import { Suspense } from 'react'
import { SignInForm } from './SignInForm'

export default function SignInPage() {
  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Sign in</h1>
      <p className="muted">
        Sign in with a verified account. New here? Create an account and confirm your email first.
      </p>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
