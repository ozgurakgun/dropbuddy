import { AppShell } from '@/components/AppShell'
import { prisma } from '@/lib/prisma'
import { requireDriver } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function DriverHomePage() {
  const session = await requireDriver()

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      deliveryAssignments: {
        where: {
          status: { in: ['SUGGESTED', 'ACCEPTED', 'ACTIVE'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { order: true },
      },
    },
  })

  return (
    <AppShell title="Driver" nav={[{ href: '/driver', label: 'Assignments' }, { href: '/', label: 'Home' }]}>
      <p className="muted">
        Punch Picked up / Delivered and share geolocation while on an active delivery. Punch and
        geo APIs land next.
      </p>
      {!profile ? (
        <p className="muted">No driver profile linked to this account.</p>
      ) : (
        <ul className="panel-list">
          {profile.deliveryAssignments.length === 0 ? (
            <li className="muted">No active assignments.</li>
          ) : (
            profile.deliveryAssignments.map((assignment) => (
              <li key={assignment.id}>
                <strong>
                  {assignment.order.customerName || 'Order'} · {assignment.status}
                </strong>
                <div className="muted">{assignment.order.deliveryAddressText}</div>
              </li>
            ))
          )}
        </ul>
      )}
    </AppShell>
  )
}
