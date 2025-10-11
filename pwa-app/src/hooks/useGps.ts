// src/hooks/useGps.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GOOD_ACC_THRESHOLD,
  STABLE_WINDOW_MS,
  STABLE_MIN_GOOD,
  MAX_SPREAD_M,
  BAD_PERSIST_MS,
  ACCURACY_BAD_THRESHOLD,
  SMOOTH_N,
  distanceMeters
} from "../lib/geo";

export type RunMode = "manual" | "warming" | "auto";

type StabSample = { lat: number; lon: number; acc: number; ts: number };

export function useGps() {
  const hasGeo = typeof navigator !== "undefined" && "geolocation" in navigator;

  // UI/tilstande
  const [mode, setMode] = useState<RunMode>("manual");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [gpsBtnClicked, setGpsBtnClicked] = useState(false);
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [showAutoToast, setShowAutoToast] = useState(false);
  const prevModeRef = useRef<RunMode>(mode);

  // smoothing buffer til geofence/visning
  const [posBuffer, setPosBuffer] = useState<[number, number][]>([]);
  const smoothedPos = useMemo(() => {
    if (posBuffer.length === 0) return null;
    const lat = posBuffer.reduce((s, p) => s + p[0], 0) / posBuffer.length;
    const lon = posBuffer.reduce((s, p) => s + p[1], 0) / posBuffer.length;
    return [lat, lon] as [number, number];
  }, [posBuffer]);

  // refs til stabilitet/fallback
  const stabBufRef = useRef<StabSample[]>([]);
  const badSinceRef = useRef<number | null>(null);
  const downgradePendingRef = useRef(false);

  const watchRef = useRef<number | null>(null);

  const startGeoWatch = useCallback(() => {
    if (!hasGeo) return;

    if (watchRef.current != null) {
      try { navigator.geolocation.clearWatch(watchRef.current); } catch {}
      watchRef.current = null;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(false);

        const cur: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const acc = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;

        setUserPos(cur);
        setAccuracyM(acc);

        // Smoothing til geofence/visning
        setPosBuffer(prev => {
          const next = [...prev, cur];
          if (next.length > SMOOTH_N) next.shift();
          return next;
        });

        const now = Date.now();

        // Vedvarende dårlig GPS → marker tidsstempel
        if (acc != null && acc >= ACCURACY_BAD_THRESHOLD) {
          if (badSinceRef.current == null) badSinceRef.current = now;
        } else {
          badSinceRef.current = null;
        }

        // Stabilitets-sampling (auto-opgradering)
        stabBufRef.current = stabBufRef.current.filter(s => now - s.ts <= STABLE_WINDOW_MS);
        const good = acc != null && acc <= GOOD_ACC_THRESHOLD;
        if (good) {
          stabBufRef.current.push({ lat: cur[0], lon: cur[1], acc, ts: now });
        }

        if (mode !== "auto") {
          // Forsøg at opgradere til auto
          const arr = stabBufRef.current;
          if (arr.length >= STABLE_MIN_GOOD) {
            const latAvg = arr.reduce((s, a) => s + a.lat, 0) / arr.length;
            const lonAvg = arr.reduce((s, a) => s + a.lon, 0) / arr.length;
            let maxD = 0;
            for (const s of arr) {
              const d = distanceMeters([latAvg, lonAvg], [s.lat, s.lon]);
              if (d > maxD) maxD = d;
            }
            if (maxD <= MAX_SPREAD_M) {
              setMode("auto");
            } else if (mode === "manual") {
              setMode("warming");
            }
          } else if (mode === "manual" && (acc ?? 9999) < 9999) {
            setMode("warming");
          }
        } else {
          // I auto: vurder nedgradering ved vedvarende dårlig GPS
          if (badSinceRef.current != null && now - badSinceRef.current >= BAD_PERSIST_MS) {
            // nedgrader først når overlay er lukket
            downgradePendingRef.current = true;
            // selve nedgraderingen trigges via handleOverlayClosed()
          }
        }
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 }
    );
  }, [hasGeo, mode]);

  useEffect(() => {
    if (!hasGeo) {
      setGeoError(true);
      return;
    }
    startGeoWatch();
    return () => {
      if (watchRef.current != null) {
        try { navigator.geolocation.clearWatch(watchRef.current); } catch {}
        watchRef.current = null;
      }
    };
  }, [hasGeo, startGeoWatch]);

  // Toast når vi går i auto første gang
  useEffect(() => {
    const prev = prevModeRef.current;
    if ((prev === "manual" || prev === "warming") && mode === "auto") {
      setShowAutoToast(true);
      const t = setTimeout(() => setShowAutoToast(false), 2500);
      prevModeRef.current = mode;
      return () => clearTimeout(t);
    }
    prevModeRef.current = mode;
  }, [mode]);

  const requestGpsPermissionOnce = useCallback(() => {
    if (!hasGeo) return;
    setGpsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoError(false);
        setGpsRequesting(false);
        startGeoWatch();
      },
      () => {
        setGeoError(true);
        setGpsRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [hasGeo, startGeoWatch]);

  /** Kald denne når overlayet lukkes – fuldfører evt. “udskudt” nedgradering til manual */
  const handleOverlayClosed = useCallback(() => {
    if (downgradePendingRef.current) {
      setMode("manual");
      downgradePendingRef.current = false;
      badSinceRef.current = null;
    }
  }, []);

  const isIOS = typeof navigator !== "undefined" &&
    ((/iP(hone|ad|od)/i.test(navigator.userAgent)) ||
     ((navigator as any).platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));

  return {
    // til UI
    mode,
    userPos,
    accuracyM,
    geoError,
    gpsBtnClicked,
    setGpsBtnClicked,
    gpsRequesting,
    showAutoToast,
    isIOS,

    // til knap
    requestGpsPermissionOnce,

    // til geofence
    smoothedPos,

    // overlay callback for nedgradering
    handleOverlayClosed,
  };
}
