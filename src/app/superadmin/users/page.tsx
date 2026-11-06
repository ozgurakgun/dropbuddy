import { AppShell } from '@/components/AppShell'
import { InviteUserForm } from '@/components/InviteUserForm'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function SuperadminUsersPage() {
  await requireSuperAdmin()

  const [tenants, users] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        isRestaurantAdmin: true,
        isDriver: true,
        password: true,
        tenant: { select: { name: true, slug: true } },
      },
    }),
  ])

  return (
    <AppShell
      title="Users"
      nav={[
        { href: '/superadmin/tenants', label: 'Tenants' },
        { href: '/superadmin/users', label: 'Users' },
        { href: '/', label: 'Home' },
      ]}
    >
      <InviteUserForm
        action="/api/superadmin/users"
        tenants={tenants}
        defaultRole="restaurant_admin"
        title="Create account for a restaurant"
      />
      <hr className="section-rule" />
      <ul className="panel-list">
        {users.map((user) => {
          const role = user.isSuperAdmin
            ? 'Superadmin'
            : user.isRestaurantAdmin
              ? 'Restaurant admin'
              : user.isDriver
                ? 'Driver'
                : 'User'
          const status = user.isSuperAdmin ? 'Active' : user.password ? 'Active' : 'Invite pending'
          return (
            <li key={user.id}>
              <strong>
                {user.name || user.email} · {role}
              </strong>
              <div className="muted">
                {user.email}
                {user.tenant ? ` · ${user.tenant.name}` : ''} · {status}
              </div>
            </li>
          )
        })}
      </ul>
    </AppShell>
  )
}
