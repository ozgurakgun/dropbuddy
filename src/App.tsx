import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { AdminPanel } from './admin/AdminPanel'
import {
  DEFAULT_SHOP_CONFIG,
  DELIVERY_MS_PER_MILE,
  EMPTY_PREP_CATALOG,
  MIN_DELIVERY_MS,
  MILES_TO_METERS,
} from './domain/defaults'
import type { Driver, DropBuddyOrder, PrepCatalog, ShopConfig } from './domain/types'
import { assignFirstAvailable } from './dispatch/engine'
import { IntakePanel } from './intake/IntakePanel'
import { deliveryDurationMs, pointWithinRadiusMiles } from './sim/geo'
import './App.css'

type Tab = 'operations' | 'admin' | 'intake'

const MENU_ITEMS = [
  'Margherita Pizza',
  'Pepperoni Pizza',
  'Chicken Burger',
  'Veggie Wrap',
  'Fries',
  'Caesar Salad',
  'Garlic Bread',
  'Cheesecake',
]
const CUSTOMER_NAMES = ['Ava', 'Noah', 'Olivia', 'Luca', 'Mia', 'Leo', 'Isla', 'Jack']
const rand = (min: number, max: number) => Math.random() * (max - min) + min

function randomItems(): DropBuddyOrder['items'] {
  const count = Math.floor(rand(1, 5))
  return [...MENU_ITEMS]
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
    .map((name) => ({ name, quantity: 1 }))
}

function buildDrivers(count: number, shop: ShopConfig['location'], prev: Driver[]): Driver[] {
  const next: Driver[] = []
  for (let i = 1; i <= count; i += 1) {
    const id = `d${i}`
    const existing = prev.find((d) => d.id === id)
    next.push(
      existing ?? {
        id,
        name: `Driver ${i}`,
        isAvailable: true,
        currentLocation: shop,
      },
    )
  }
  return next
}

function App() {
  const [tab, setTab] = useState<Tab>('operations')
  const [config, setConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG)
  const [catalog, setCatalog] = useState<PrepCatalog>(EMPTY_PREP_CATALOG)
  const [orders, setOrders] = useState<DropBuddyOrder[]>([])
  const [drivers, setDrivers] = useState<Driver[]>(() =>
    buildDrivers(DEFAULT_SHOP_CONFIG.driverCount, DEFAULT_SHOP_CONFIG.location, []),
  )

  const ordersRef = useRef(orders)
  const driversRef = useRef(drivers)
  const configRef = useRef(config)

  useEffect(() => {
    ordersRef.current = orders
  }, [orders])
  useEffect(() => {
    driversRef.current = drivers
  }, [drivers])
  useEffect(() => {
    configRef.current = config
  }, [config])

  const applyConfig = (next: ShopConfig) => {
    setConfig(next)
    setDrivers((prev) => buildDrivers(next.driverCount, next.location, prev))
    setOrders((prev) =>
      prev.map((order) => {
        if (!order.assignedDriverId) return order
        const driverNumber = Number(order.assignedDriverId.replace('d', ''))
        if (Number.isNaN(driverNumber) || driverNumber <= next.driverCount) return order
        if (order.status !== 'en-route') return order
        return {
          ...order,
          status: 'pending',
          assignedDriverId: undefined,
          assignedAt: undefined,
          deliveryBatchId: undefined,
        }
      }),
    )
  }

  useEffect(() => {
    const intakeTimer = setInterval(() => {
      const cfg = configRef.current
      const now = Date.now()
      const location = pointWithinRadiusMiles(cfg.location, Math.max(1, cfg.serviceRadiusMiles))
      const newOrder: DropBuddyOrder = {
        id: `ORD-${Math.floor(now / 1000)}-${Math.floor(rand(100, 999))}`,
        customerName: CUSTOMER_NAMES[Math.floor(rand(0, CUSTOMER_NAMES.length))],
        deliveryAddressText: 'Simulated address',
        location,
        items: randomItems(),
        orderedAt: now,
        requestedBy: now + Math.floor(rand(20, 55)) * 60_000,
        status: 'pending',
      }
      setOrders((prev) => [newOrder, ...prev].slice(0, 80))
    }, Math.max(0.5, config.orderFrequencySeconds) * 1000)
    return () => clearInterval(intakeTimer)
  }, [config.orderFrequencySeconds])

  useEffect(() => {
    const assignmentTimer = setInterval(() => {
      const { orders: nextOrders, drivers: nextDrivers, changed } = assignFirstAvailable(
        ordersRef.current,
        driversRef.current,
      )
      if (changed) {
        setOrders(nextOrders)
        setDrivers(nextDrivers)
      }
    }, 1000)
    return () => clearInterval(assignmentTimer)
  }, [])

  useEffect(() => {
    const completionTimer = setInterval(() => {
      const now = Date.now()
      const cfg = configRef.current
      const nextOrders = ordersRef.current.map((o) => ({ ...o }))
      const nextDrivers = driversRef.current.map((d) => ({ ...d }))
      let hasChanges = false

      for (const driver of nextDrivers.filter((d) => !d.isAvailable && d.activeDeliveryId)) {
        const target = nextOrders.find(
          (o) =>
            o.status === 'en-route' &&
            o.assignedDriverId === driver.id &&
            (o.deliveryBatchId === driver.activeDeliveryId || o.id === driver.activeDeliveryId),
        )
        if (!target || !target.location) continue
        if (target.assignedAt === undefined) {
          target.assignedAt = now
          hasChanges = true
          continue
        }
        const need = deliveryDurationMs(
          cfg.location,
          target.location,
          cfg.driverSpeed,
          DELIVERY_MS_PER_MILE,
          MIN_DELIVERY_MS,
        )
        if (now - target.assignedAt < need) continue
        target.status = 'delivered'
        target.deliveredAt = now
        target.assignedAt = undefined
        driver.isAvailable = true
        driver.activeDeliveryId = undefined
        driver.currentLocation = cfg.location
        hasChanges = true
      }

      if (hasChanges) {
        setOrders(nextOrders)
        setDrivers(nextDrivers)
      }
    }, 500)
    return () => clearInterval(completionTimer)
  }, [])

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'delivered'), [orders])
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'delivered').slice(0, 15),
    [orders],
  )
  const activeDeliveries = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'en-route' && o.assignedDriverId && o.location)
        .map((o) => ({
          id: o.id,
          driverId: o.assignedDriverId as string,
          points: [config.location, o.location!] as LatLngExpression[],
        })),
    [orders, config.location],
  )

  return (
    <main className="layout">
      <header>
        <h1>DropBuddy</h1>
        <p className="muted">{config.shopName} — {config.addressLabel}</p>
        <nav className="tabs">
          <button type="button" className={tab === 'operations' ? 'active' : ''} onClick={() => setTab('operations')}>
            Operations
          </button>
          <button type="button" className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
            Admin
          </button>
          <button type="button" className={tab === 'intake' ? 'active' : ''} onClick={() => setTab('intake')}>
            Intake
          </button>
        </nav>
      </header>

      {tab === 'admin' && (
        <AdminPanel config={config} onConfigChange={applyConfig} catalog={catalog} onCatalogChange={setCatalog} />
      )}

      {tab === 'intake' && (
        <IntakePanel
          onOrdersIngested={(incoming) => setOrders((prev) => [...incoming, ...prev].slice(0, 80))}
        />
      )}

      {tab === 'operations' && (
        <>
          <section className="map-panel">
            <MapContainer
              key={`${config.location[0]},${config.location[1]}`}
              center={config.location}
              zoom={11}
              scrollWheelZoom
              className="map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Circle
                center={config.location}
                radius={Math.max(1, config.serviceRadiusMiles) * MILES_TO_METERS}
                pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.08 }}
              />
              <Marker position={config.location}>
                <Popup>{config.shopName}</Popup>
              </Marker>
              {activeOrders
                .filter((o) => o.location)
                .map((order) => (
                  <Marker key={order.id} position={order.location!}>
                    <Popup>
                      <strong>{order.id}</strong>
                      <p>{order.customerName}</p>
                      <p>Status: {order.status}</p>
                    </Popup>
                  </Marker>
                ))}
              {activeDeliveries.map((delivery) => (
                <Polyline key={delivery.id} positions={delivery.points} color="#f97316" weight={3}>
                  <Tooltip permanent direction="center" className="delivery-line-label">
                    {delivery.driverId}
                  </Tooltip>
                </Polyline>
              ))}
            </MapContainer>
          </section>
          <section className="status-grid">
            <div className="card">
              <h2>Drivers</h2>
              {drivers.map((driver) => (
                <p key={driver.id}>
                  {driver.name}: {driver.isAvailable ? 'Available' : `On ${driver.activeDeliveryId}`}
                </p>
              ))}
            </div>
            <div className="card">
              <h2>Open Orders</h2>
              <ul>
                {activeOrders.slice(0, 12).map((order) => (
                  <li key={order.id}>
                    <strong>{order.id}</strong> — {order.items.map((i) => i.name).join(', ')} —{' '}
                    {order.requestedBy ? `ETA ${new Date(order.requestedBy).toLocaleTimeString()}` : 'no ETA'} —{' '}
                    {order.status}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2>Delivered (History)</h2>
              <ul>
                {deliveredOrders.map((order) => (
                  <li key={order.id}>
                    <strong>{order.id}</strong> — delivered at{' '}
                    {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : '-'}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default App
