import type { DeliveryBatch, Driver, DropBuddyOrder, PrepCatalog, ShopConfig } from '../domain/types'

/**
 * Dispatch decisions (groundwork stubs).
 * Later: real batching, kitchen start from prep catalog + driver ETA.
 */

export type DispatchPlan = {
  batches: DeliveryBatch[]
  orders: DropBuddyOrder[]
  drivers: Driver[]
}

/** First available driver gets one pending order (MVP1 behaviour, kept as baseline). */
export function assignFirstAvailable(
  orders: DropBuddyOrder[],
  drivers: Driver[],
  now = Date.now(),
): { orders: DropBuddyOrder[]; drivers: Driver[]; changed: boolean } {
  const nextOrders = orders.map((o) => ({ ...o }))
  const nextDrivers = drivers.map((d) => ({ ...d }))
  let changed = false

  for (const order of nextOrders) {
    if (order.status !== 'pending') continue
    if (order.assignedDriverId) continue
    const driver = nextDrivers.find(
      (d) => d.isAvailable && !nextOrders.some((o) => o.status === 'en-route' && o.assignedDriverId === d.id),
    )
    if (!driver) break
    order.status = 'en-route'
    order.assignedDriverId = driver.id
    order.assignedAt = now
    order.deliveryBatchId = `batch-solo-${order.id}`
    driver.isAvailable = false
    driver.activeDeliveryId = order.deliveryBatchId
    changed = true
  }

  return { orders: nextOrders, drivers: nextDrivers, changed }
}

/**
 * Placeholder: one order per batch.
 * Future: cluster nearby addresses / compatible ETAs into multi-order drops.
 */
export function proposeBatches(
  orders: DropBuddyOrder[],
  drivers: Driver[],
  _config: ShopConfig,
  now = Date.now(),
): DeliveryBatch[] {
  const pending = orders.filter((o) => o.status === 'pending' && !o.deliveryBatchId)
  const available = drivers.filter((d) => d.isAvailable)
  const batches: DeliveryBatch[] = []
  const n = Math.min(pending.length, available.length)
  for (let i = 0; i < n; i += 1) {
    const order = pending[i]
    const driver = available[i]
    batches.push({
      id: `batch-${now}-${i}`,
      driverId: driver.id,
      orderIds: [order.id],
      plannedStartAt: now,
      status: 'planned',
    })
  }
  return batches
}

/**
 * When should the kitchen start?
 * Groundwork: start immediately if prep unknown; otherwise now + slack before driver departure.
 */
export function proposeKitchenStart(
  order: DropBuddyOrder,
  catalog: PrepCatalog,
  driverAvailableAt: number,
  now = Date.now(),
): { kitchenStartAt: number; expectedReadyAt: number; unknownItems: string[] } {
  const unknownItems: string[] = []
  let prepMinutes = 0
  for (const line of order.items) {
    const match = catalog.items.find(
      (c) => c.name.toLowerCase() === line.name.toLowerCase() && c.prepMinutes != null,
    )
    if (!match || match.prepMinutes == null) {
      unknownItems.push(line.name)
      prepMinutes = Math.max(prepMinutes, 15)
    } else {
      prepMinutes = Math.max(prepMinutes, match.prepMinutes * line.quantity)
    }
  }
  const prepMs = prepMinutes * 60_000
  const kitchenStartAt = Math.max(now, driverAvailableAt - prepMs)
  return {
    kitchenStartAt,
    expectedReadyAt: kitchenStartAt + prepMs,
    unknownItems,
  }
}
