import { EARTH_RADIUS_MILES } from '../domain/defaults'
import type { LatLng } from '../domain/types'

const rand = (min: number, max: number) => Math.random() * (max - min) + min

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_MILES * c
}

export function pointWithinRadiusMiles(center: LatLng, radiusMiles: number): LatLng {
  const radiusKm = radiusMiles * 1.60934
  const distanceKm = Math.sqrt(Math.random()) * radiusKm
  const bearing = rand(0, 2 * Math.PI)
  const lat1 = (center[0] * Math.PI) / 180
  const lon1 = (center[1] * Math.PI) / 180
  const angularDistance = distanceKm / 6371
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]
}

export function deliveryDurationMs(
  shop: LatLng,
  dropoff: LatLng,
  speedMultiplier: number,
  msPerMile: number,
  minMs: number,
): number {
  const scale = Math.max(0.05, speedMultiplier)
  const miles = haversineMiles(shop, dropoff)
  return Math.max(minMs / scale, (miles * msPerMile) / scale)
}
