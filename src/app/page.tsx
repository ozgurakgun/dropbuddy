import Link from 'next/link'
import { getServerAuthSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerAuthSession()

  const destination = session?.user.isSuperAdmin
    ? '/superadmin/tenants'
    : session?.user.isDriver
      ? '/driver'
      : session?.user.isRestaurantAdmin
        ? '/restaurant/orders'
        : session
          ? '/pending'
          : '/auth/signin'

  return (
    <div className="home-hero">
      <p className="eyebrow">DropBuddy</p>
      <h1>Restaurant dispatch for camera intake and live drivers.</h1>
      <p className="muted">
        Capture slips in the browser, auto-suggest a driver, override when needed, and track
        deliveries on a live map.
      </p>
      <div className="home-actions">
        <Link href={destination}>{session ? 'Open app' : 'Sign in'}</Link>
        {session ? null : <Link href="/auth/signup">Create account</Link>}
      </div>
    </div>
  )
}
