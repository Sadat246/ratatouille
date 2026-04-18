export const EARTH_RADIUS_MILES = 3959;

/**
 * Computes the haversine great-circle distance in miles between two lat/lng points.
 * Uses LEAST(1.0, ...) guard to prevent acos domain error from floating-point imprecision.
 */
export function computeHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const inner =
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lng2 - lng1) * Math.PI) / 180) +
    Math.sin((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180);
  return EARTH_RADIUS_MILES * Math.acos(Math.min(1.0, inner));
}
