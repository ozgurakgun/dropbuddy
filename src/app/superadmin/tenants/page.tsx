import { AppShell } from '@/components/AppShell'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function SuperadminTenantsPage() {
  await requireSuperAdmin()
  const tenants = await prisma.tenant.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, orders: true, driverProfiles: true } },
    },
  })

  return (
    <AppShell
      title="Tenants"
      nav={[
        { href: '/superadmin/tenants', label: 'Tenants' },
        { href: '/', label: 'Home' },
      ]}
    >
      <p className="muted">
        Superadmin shell for creating restaurants and inviting restaurant admins. Full invite
        flows land in a follow-up PR.
      </p>
      <ul className="panel-list">
        {tenants.length === 0 ? (
          <li className="muted">No tenants yet. Seed the database or create one next.</li>
        ) : (
          tenants.map((tenant) => (
            <li key={tenant.id}>
              <strong>{tenant.name}</strong>
              <div className="muted">
                /{tenant.slug} · {tenant._count.users} users · {tenant._count.driverProfiles}{' '}
                drivers · {tenant._count.orders} orders
              </div>
            </li>
          ))
        )}
      </ul>
    </AppShell>
  )
}
