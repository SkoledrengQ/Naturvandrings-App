export type LatLng = [number, number];

const R = 6371000; // meter
const toRad = (x: number) => (x * Math.PI) / 180;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function insideRadius(user: LatLng, center: LatLng, radiusMeters: number): boolean {
  return haversine(user, center) <= radiusMeters;
}
