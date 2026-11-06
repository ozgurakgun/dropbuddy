import Link from 'next/link'
import { requireSession } from '@/lib/session'
import { homePathForUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PendingPage() {
  const session = await requireSession()
  const home = homePathForUser(session.user)
  if (home !== '/pending') {
    redirect(home)
  }

  return (
    <div className="auth-card">
      <p className="eyebrow">DropBuddy</p>
      <h1>Account pending assignment</h1>
      <p className="muted">
        Your email is verified. A DropBuddy admin still needs to attach your account to a
        restaurant (as staff or driver) before you can use the app.
      </p>
      <p className="muted">
        <Link href="/api/auth/signout">Sign out</Link>
      </p>
    </div>
  )
}
