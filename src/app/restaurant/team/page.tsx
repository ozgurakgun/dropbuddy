import { AppShell } from '@/components/AppShell'
import { InviteUserForm } from '@/components/InviteUserForm'
import { prisma } from '@/lib/prisma'
import { requireRestaurantAccess } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function RestaurantTeamPage() {
  const session = await requireRestaurantAccess()
  const tenantId = session.user.tenantId!

  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      isRestaurantAdmin: true,
      isDriver: true,
      password: true,
      emailVerified: true,
      lastLoginAt: true,
    },
  })

  return (
    <AppShell
      title="Team"
      nav={[
        { href: '/restaurant/orders', label: 'Orders' },
        { href: '/restaurant/map', label: 'Live map' },
        { href: '/restaurant/team', label: 'Team' },
        { href: '/', label: 'Home' },
      ]}
    >
      <InviteUserForm
        action="/api/restaurant/users"
        defaultRole="driver"
        title="Invite teammate"
      />
      <hr className="section-rule" />
      <ul className="panel-list">
        {users.length === 0 ? (
          <li className="muted">No accounts for this restaurant yet.</li>
        ) : (
          users.map((user) => {
            const role = user.isRestaurantAdmin
              ? 'Restaurant admin'
              : user.isDriver
                ? 'Driver'
                : 'User'
            const status = user.password ? 'Active' : 'Invite pending'
            return (
              <li key={user.id}>
                <strong>
                  {user.name || user.email} · {role}
                </strong>
                <div className="muted">
                  {user.email} · {status}
                  {user.lastLoginAt ? ` · last login ${user.lastLoginAt.toISOString()}` : ''}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </AppShell>
  )
}
