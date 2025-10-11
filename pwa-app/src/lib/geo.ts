// src/lib/geo.ts
export const ENTER_MIN_RADIUS = 22;        // min. enter-radius (meter) hvis POI ikke har radiusMeters
export const ACC_MULTIPLIER   = 1.2;       // accuracy buffer (20%)
export const EXIT_EXTRA_RATIO = 1.25;      // exit-radius = enter-radius * 1.25
export const DWELL_MS         = 3000;      // ms inde i zonen før aktivering

// (bruges i GPS-smoothing / stabilitetslogik)
export const SMOOTH_N               = 5;
export const GOOD_ACC_THRESHOLD     = 40;     // “god” GPS-accuracy (m)
export const STABLE_WINDOW_MS       = 8000;   // hvor længe vi ser tilbage
export const STABLE_MIN_GOOD        = 2;      // mindst N gode fixes
export const MAX_SPREAD_M           = 25;     // fixes skal ligge tæt (varians)
export const BAD_PERSIST_MS         = 10000;  // vedvarende dårlig GPS før fallback
export const ACCURACY_BAD_THRESHOLD = 100;    // når acc >= 100 m, betragtes som dårlig (til fallback)

export type LatLng = { lat: number; lng: number };

export function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Effektiv enter-radius som i din RouteRun: POI-radius vs. inflated accuracy */
export function effectiveEnterRadiusMeters(poiRadiusMeters: number | undefined, accuracyM: number | null) {
  const base = poiRadiusMeters ?? ENTER_MIN_RADIUS;
  const accInflated = Math.ceil((accuracyM ?? ENTER_MIN_RADIUS) * ACC_MULTIPLIER);
  return Math.max(base, accInflated);
}
