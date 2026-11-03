import type { PrepCatalog, ShopConfig } from './types'

/** Great Western Rd, Glasgow — MVP1 default. */
export const DEFAULT_SHOP_LOCATION: [number, number] = [55.8797, -4.3112]

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'DropBuddy Kitchen',
  location: DEFAULT_SHOP_LOCATION,
  addressLabel: 'Great Western Rd, Glasgow',
  driverCount: 2,
  serviceRadiusMiles: 20,
  orderFrequencySeconds: 3.5,
  driverSpeed: 1,
}

/** Incomplete by design — populated from invoices + admin answers over time. */
export const EMPTY_PREP_CATALOG: PrepCatalog = {
  items: [],
  openQuestions: [],
}

export const MILES_TO_METERS = 1609.34
export const EARTH_RADIUS_MILES = 3958.8
export const DELIVERY_MS_PER_MILE = 12_000
export const MIN_DELIVERY_MS = 3_000
