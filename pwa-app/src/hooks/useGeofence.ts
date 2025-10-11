// src/hooks/useGeofence.ts
import { useEffect, useMemo, useRef, useState } from "react";
import {
  distanceMeters,
  effectiveEnterRadiusMeters,
  EXIT_EXTRA_RATIO,
  DWELL_MS
} from "../lib/geo";

// Brug den eksisterende Poi-type fra lib/data
import type { Poi } from "../lib/data";
import type { RunMode } from "./useGps";

// Robust lon-reader (understøtter både .lon og .lng i data)
function getLon(p: Poi): number {
  const a = p as any;
  return (a.lon ?? a.lng) as number;
}

export function useGeofence(
  mode: RunMode,
  smoothedPos: [number, number] | null,
  orderedPois: Poi[],
  accuracyM: number | null,
  visited: Set<number>
) {
  const [activePoiId, setActivePoiId] = useState<number | null>(null);
  const [dwellTargetId, setDwellTargetId] = useState<number | null>(null);
  const [dwellStart, setDwellStart] = useState<number | null>(null);

  const byId = useMemo(() => new Map(orderedPois.map(p => [p.id, p])), [orderedPois]);

  useEffect(() => {
    if (mode !== "auto" || !smoothedPos || orderedPois.length === 0) {
      setActivePoiId(null);
      setDwellTargetId(null);
      setDwellStart(null);
      return;
    }

    // Hysterese: hold fast i aktivt POI indtil vi er uden for exit-radius
    if (activePoiId) {
      const ap = byId.get(activePoiId);
      if (ap) {
        const enterR = effectiveEnterRadiusMeters((ap as any).radiusMeters, accuracyM);
        const exitR = enterR * EXIT_EXTRA_RATIO;
        const dist = distanceMeters(smoothedPos, [ap.lat, getLon(ap)]);
        if (dist <= exitR) {
          setDwellTargetId(null);
          setDwellStart(null);
          return;
        }
        setActivePoiId(null);
      }
    }

    // Kandidater inden for enter-radius
    const inRange: { p: Poi; dist: number }[] = [];
    for (const p of orderedPois) {
      const enterR = effectiveEnterRadiusMeters((p as any).radiusMeters, accuracyM);
      const dist = distanceMeters(smoothedPos, [p.lat, getLon(p)]);
      if (dist <= enterR) inRange.push({ p, dist });
    }

    if (inRange.length === 0) {
      setDwellTargetId(null);
      setDwellStart(null);
      return;
    }

    // Foretræk ubesøgte; ellers nærmeste
    const notVisited = inRange.filter(x => !visited.has(x.p.id));
    const pick = (notVisited.length > 0 ? notVisited : inRange)
      .sort((a, b) => a.dist - b.dist)[0]!.p;

    // Dwell
    if (dwellTargetId !== pick.id) {
      setDwellTargetId(pick.id);
      setDwellStart(performance.now());
      return;
    }

    const now = performance.now();
    if (dwellStart && now - dwellStart >= DWELL_MS) {
      setActivePoiId(prev => (prev === pick.id ? prev : pick.id));
      setDwellStart(now);
    }
  }, [mode, smoothedPos, orderedPois, accuracyM, visited, activePoiId, byId, dwellTargetId, dwellStart]);

  return { activePoiId };
}
