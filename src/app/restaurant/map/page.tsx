import { AppShell } from '@/components/AppShell'
import { prisma } from '@/lib/prisma'
import { requireRestaurantAccess } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function RestaurantMapPage() {
  const session = await requireRestaurantAccess()
  const tenantId = session.user.tenantId!

  const drivers = await prisma.driverProfile.findMany({
    where: { tenantId, isActive: true },
    include: { user: true },
  })

  const userIds = drivers.map((driver) => driver.userId)
  const recentPings = userIds.length
    ? await prisma.locationPing.findMany({
        where: { tenantId, userId: { in: userIds } },
        orderBy: { recordedAt: 'desc' },
        take: userIds.length * 5,
      })
    : []

  const latestPingByUser = new Map<string, (typeof recentPings)[number]>()
  for (const ping of recentPings) {
    if (!latestPingByUser.has(ping.userId)) {
      latestPingByUser.set(ping.userId, ping)
    }
  }

  return (
    <AppShell
      title="Live map"
      nav={[
        { href: '/restaurant/orders', label: 'Orders' },
        { href: '/restaurant/map', label: 'Live map' },
        { href: '/', label: 'Home' },
      ]}
    >
      <p className="muted">
        v1 will poll location pings and render drivers on Leaflet. This shell lists the latest
        known positions per active driver.
      </p>
      <ul className="panel-list">
        {drivers.length === 0 ? (
          <li className="muted">No active drivers assigned to this restaurant.</li>
        ) : (
          drivers.map((driver) => {
            const ping = latestPingByUser.get(driver.userId)
            const label = driver.user.name || driver.user.email
            return (
              <li key={driver.id}>
                <strong>{label}</strong>
                <div className="muted">
                  {ping
                    ? `${ping.latitude.toFixed(5)}, ${ping.longitude.toFixed(5)} · ${ping.recordedAt.toISOString()}`
                    : 'No location ping yet'}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </AppShell>
  )
}
