import { AppShell } from '@/components/AppShell'
import { prisma } from '@/lib/prisma'
import { requireRestaurantAccess } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function RestaurantOrdersPage() {
  const session = await requireRestaurantAccess()
  const tenantId = session.user.tenantId!

  const orders = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: {
      deliveryAssignments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          driverProfile: { include: { user: true } },
        },
      },
    },
  })

  return (
    <AppShell
      title="Orders"
      nav={[
        { href: '/restaurant/orders', label: 'Orders' },
        { href: '/restaurant/map', label: 'Live map' },
        { href: '/restaurant/team', label: 'Team' },
        { href: '/', label: 'Home' },
      ]}
    >
      <p className="muted">
        Capture slips with camera/gallery, confirm OCR drafts, accept the suggested driver, or
        override. Capture and assign APIs come next.
      </p>
      <ul className="panel-list">
        {orders.length === 0 ? (
          <li className="muted">No orders for this restaurant yet.</li>
        ) : (
          orders.map((order) => {
            const assignment = order.deliveryAssignments[0]
            const driverName = assignment?.driverProfile.user.name || assignment?.driverProfile.user.email
            return (
              <li key={order.id}>
                <strong>
                  {order.customerName || 'Unnamed'} · {order.status}
                </strong>
                <div className="muted">
                  {order.deliveryAddressText}
                  {assignment ? ` · Driver ${driverName}` : ' · Unassigned'}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </AppShell>
  )
}
