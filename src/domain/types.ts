/** Shared DropBuddy domain types (MVP2 groundwork). */

export type LatLng = [number, number]

export type ShopConfig = {
  /** Display name for the restaurant / dark kitchen. */
  shopName: string
  /** Map pin / service centre. */
  location: LatLng
  /** Human-readable address for admin display. */
  addressLabel: string
  /** How many delivery drivers are on shift. */
  driverCount: number
  /** Service radius used for planning / map (miles). */
  serviceRadiusMiles: number
  /** Simulation: order intake frequency (seconds). Ignored when scanner intake is live. */
  orderFrequencySeconds: number
  /** Simulation: driver speed multiplier (1 = baseline). */
  driverSpeed: number
}

export type PrepCatalogItem = {
  id: string
  /** Menu / invoice item name (normalized over time). */
  name: string
  /** Minutes of kitchen time; null = unknown — admin should answer later. */
  prepMinutes: number | null
  /** How we learned this (manual admin, invoice OCR, inferred). */
  source: 'admin' | 'invoice' | 'inferred' | 'unknown'
  updatedAt: number
}

export type PrepCatalog = {
  items: PrepCatalogItem[]
  /** Open questions for the admin (incomplete knowledge). */
  openQuestions: PrepQuestion[]
}

export type PrepQuestion = {
  id: string
  itemName: string
  askedAt: number
  prompt: string
}

export type OrderItem = {
  name: string
  quantity: number
  notes?: string
}

export type DropBuddyOrder = {
  id: string
  externalId?: string
  customerName?: string
  customerPhone?: string
  deliveryAddressText: string
  location?: LatLng
  items: OrderItem[]
  orderedAt: number
  requestedBy?: number
  status: 'intake' | 'pending' | 'preparing' | 'ready' | 'en-route' | 'delivered' | 'cancelled'
  assignedDriverId?: string
  deliveryBatchId?: string
  kitchenStartAt?: number
  expectedReadyAt?: number
  assignedAt?: number
  deliveredAt?: number
  rawSource?: {
    scanImageId?: string
    ocrText?: string
  }
}

export type Driver = {
  id: string
  name: string
  isAvailable: boolean
  currentLocation: LatLng
  activeDeliveryId?: string
}

export type DeliveryBatch = {
  id: string
  driverId: string
  orderIds: string[]
  plannedStartAt: number
  status: 'planned' | 'active' | 'completed'
}
