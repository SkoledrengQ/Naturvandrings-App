import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import MapView from "../components/MapView";
import StoryOverlay from "../components/StoryOverlay";
import { useHeader } from "../contexts/HeaderContext";
import { useLanguage } from "../contexts/LanguageContext";
import useWakeLock from "../hooks/useWakeLock";

const AUTO_OPEN_ON_ENTER = true; // Story overlay auto popup
const GOOD_ACC_THRESHOLD   = 40;     // m – hvad vi regner som “god”
const STABLE_WINDOW_MS     = 8000;   // ms – hvor lang tid vi kigger tilbage
const STABLE_MIN_GOOD      = 2;      // mindst 2 gode fixes
const MAX_SPREAD_M         = 25;     // målinger skal ligge tæt (varians)
const BAD_PERSIST_MS       = 10000;  // hvor længe dårlig GPS må vare før fallback

/** Lille distance-helper */
function distanceMeters(a: [number, number], b: [number, number]) {
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

/** Tuning – kan fint justeres efter felt-test */
const ENTER_MIN_RADIUS = 22;     // min. “enter” radius i meter (hvis POI ikke har radiusMeters)
const ACC_MULTIPLIER = 1.2;      // accuracy-buffer (20%)
const EXIT_EXTRA_RATIO = 1.25;   // exit-radius = enter-radius * 1.25
const DWELL_MS = 3000;           // skal være inde i (ms) før aktivering
const SMOOTH_N = 5;              // glidende gennemsnit over N positioner (til geofence – ikke til visning)
const ACCURACY_BAD_THRESHOLD = 100; // meter – vis manuel start ved >= 100 m

/** Beregn effektiv enter-radius (POI override vs. GPS accuracy) */
function effectiveEnterRadius(p: Poi, acc: number | null) {
  const base = p.radiusMeters ?? ENTER_MIN_RADIUS;
  const accInflated = Math.ceil((acc ?? ENTER_MIN_RADIUS) * ACC_MULTIPLIER);
  return Math.max(base, accInflated);
}

export default function RouteRun() {
  const { id } = useParams();
  const routeId = Number(id);
  const STORAGE_KEY = `run:${routeId}`;

  // Holder skærmen vågen under ruten
  useWakeLock(true);

  // Data
  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);

  // GPS
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [geoError, setGpsError] = useState(false);
  const watchRef = useRef<number | null>(null);
  const [gpsBtnClicked, setGpsBtnClicked] = useState(false);
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const hasGeo = typeof navigator !== "undefined" && "geolocation" in navigator;

  // Remember user’s place even when overlay is closed and GPS is off
  const [cursorIndex, setCursorIndex] = useState(0);

  // UI/state
  const [muted, setMuted] = useState(false);

  // Header (global)
  const { setTitle, setRightNode, setVariant } = useHeader();

  // POI-state
  const [activePoiId, setActivePoiId] = useState<number | null>(null); // aktuelt “inde i”
  const [shownPoiId, setShownPoiId] = useState<number | null>(null);   // overlay åbent

  // Bruges til at huske at brugeren har lukket overlay for det aktuelle POI,
  // så vi ikke auto-åbner igen før man har forladt og re-entered.
  const [dismissedPoiId, setDismissedPoiId] = useState<number | null>(null);

  // Besøgte POI’er i et run auto-åbnes kun første gang
  const [visited, setVisited] = useState<Set<number>>(() => new Set());

  // Smooth buffer til geofence (mod jitter)
  const [posBuffer, setPosBuffer] = useState<[number, number][]>([]);
  const smoothedPos = useMemo(() => {
    if (posBuffer.length === 0) return null;
    const lat = posBuffer.reduce((s, p) => s + p[0], 0) / posBuffer.length;
    const lon = posBuffer.reduce((s, p) => s + p[1], 0) / posBuffer.length;
    return [lat, lon] as [number, number];
  }, [posBuffer]);

  // Language (live i18n)
  const { lang, t } = useLanguage();

  // Hent data (reloader når lang eller routeId ændres)
  useEffect(() => {
    loadRoutes(lang).then(rs => setRoute(rs.find(r => r.id === routeId) || null));
    loadPois(lang).then(all => setPois(all.filter(p => p.routeId === routeId)));
  }, [routeId, lang]);

  // Når routeId ændres, nulstil cursor til start
  useEffect(() => {
    setCursorIndex(0);
  }, [routeId]);

  // Genindlæs run-state fra sessionStorage
  useEffect(() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cursorIndex === "number") setCursorIndex(s.cursorIndex);
    if (Array.isArray(s.visited)) setVisited(new Set<number>(s.visited));
    if (typeof s.shownPoiId === "number") setShownPoiId(s.shownPoiId);
  } catch {}
}, [STORAGE_KEY]);


  // De forskellige modes – manual, warming (venter på stabil GPS), auto
  type RunMode = "manual" | "warming" | "auto";
  const [mode, setMode] = useState<RunMode>("manual");
  const [showAutoToast, setShowAutoToast] = useState(false);

  type StabSample = { lat: number; lon: number; acc: number; ts: number };
  const stabBufRef = useRef<StabSample[]>([]);
  const badSinceRef = useRef<number | null>(null);
  const downgradePendingRef = useRef(false);
  const prevModeRef = useRef<RunMode>(mode);


  // GPS watch
  useEffect(() => {
    if (!hasGeo) {
      setGpsError(true);
      return;
    }
    startGeoWatch();
    return () => {
      if (watchRef.current != null) {
        try { navigator.geolocation.clearWatch(watchRef.current); } catch {}
        watchRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGeo]);

  // Map helpers
  const byId = useMemo(() => new Map(pois.map(p => [p.id, p])), [pois]);

  const orderedPois = useMemo(() => {
    const ids = route?.poiOrder ?? [];
    return ids.map(id => byId.get(id)).filter(Boolean) as Poi[];
  }, [route, byId]);

  // Dwell-states (for kandidat der netop er “inde i” enter-radius)
  const [dwellTargetId, setDwellTargetId] = useState<number | null>(null);
  const [dwellStart, setDwellStart] = useState<number | null>(null);

  // Geofence - Deaktiver geofence hvis vi ingen stabil position har, GPS fejl, eller accuracy er dårlig
  useEffect(() => {
    if (mode !== "auto" || !smoothedPos || orderedPois.length === 0) {
      setActivePoiId(null);
      setDwellTargetId(null);
      setDwellStart(null);
      return;
    }

    // Hvis vi allerede har en aktiv POI, hold fast indtil vi er ud over exit-radius
    if (activePoiId) {
      const ap = byId.get(activePoiId);
      if (ap) {
        const enterR = effectiveEnterRadius(ap, accuracyM);
        const exitR = enterR * EXIT_EXTRA_RATIO;
        const dist = distanceMeters(smoothedPos, [ap.lat, ap.lon]);
        if (dist <= exitR) {
          // stadig inde i hysterese-zonen → behold aktiv, nulstil dwell (vi er allerede aktive)
          setDwellTargetId(null);
          setDwellStart(null);
          return;
        }
        // ellers: vi er reelt ude → slip aktiv
        setActivePoiId(null);
        // fortsæt og se om vi rammer en anden kandidat nedenfor
      }
    }

    // Saml alle POI'er der er inden for enter-radius
    const inRange: { p: Poi; dist: number }[] = [];
    for (const p of orderedPois) {
      const enterR = effectiveEnterRadius(p, accuracyM);
      const dist = distanceMeters(smoothedPos, [p.lat, p.lon]);
      if (dist <= enterR) inRange.push({ p, dist });
    }

    if (inRange.length === 0) {
      // Ikke inde i nogen – nulstil dwell men bevar aktiv=null (håndteres ovenfor)
      setDwellTargetId(null);
      setDwellStart(null);
      return;
    }

    // Foretræk POI'er vi IKKE har besøgt endnu. Hvis alle er besøgt, tag den nærmeste.
    const notVisited = inRange.filter(x => !visited.has(x.p.id));
    const pick = (notVisited.length > 0 ? notVisited : inRange)
      .sort((a, b) => a.dist - b.dist)[0]!.p;

    // Dwell-logik på den valgte kandidat
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
  }, [smoothedPos, accuracyM, orderedPois, activePoiId, byId, dwellTargetId, dwellStart, visited, mode]);

    // Hvis vi har en aktiv POI, så sæt cursor til den
    useEffect(() => {
      if (!activePoiId) return;
      const idx = orderedPois.findIndex(p => p.id === activePoiId);
      if (idx >= 0) setCursorIndex(idx);
    }, [activePoiId, orderedPois]);

  // Afledte værdier
  const activePoi = activePoiId ? byId.get(activePoiId) ?? null : null;
  const shownPoi  = shownPoiId ? byId.get(shownPoiId) ?? null : null;

  const currentIndex = useMemo(() => {
    // Prefer what’s visible (overlay), else what GPS says, else our manual cursor
    const pickId = shownPoiId ?? activePoiId;
    if (pickId != null) {
      const idx = orderedPois.findIndex(p => p.id === pickId);
      if (idx >= 0) return idx;
    }
    return Math.min(cursorIndex, Math.max(orderedPois.length - 1, 0));
  }, [shownPoiId, activePoiId, cursorIndex, orderedPois]);


  const isFirst = currentIndex === 0;
  const isLast  = orderedPois.length > 0 && currentIndex === orderedPois.length - 1;

  // Sprogtekst (brug samme t)
  const progressText = t("run.progress", {
  cur: Math.min(currentIndex + 1, Math.max(orderedPois.length, 1)),
  total: Math.max(orderedPois.length, 1),
  });

  // Auto-åbn fortælling når vi er "inde i" et POI (dwell opfyldt)
  useEffect(() => {
    if (!AUTO_OPEN_ON_ENTER) return;
    if (!activePoiId) return;

    // Hvis brugeren læser en anden fortælling, så lad være med at stjæle fokus.
    if (shownPoiId != null && shownPoiId !== activePoiId) return;

    // Hvis brugeren lige har lukket denne fortælling, så auto-åbn ikke igen,
    // før vi har forladt og re-entered.
    if (dismissedPoiId === activePoiId) return;

    // Åbn kun første gang pr. POI
    if (visited.has(activePoiId)) return;

    setShownPoiId(activePoiId);

    // Mark som besøgt + lille vibration (Android)
    setVisited(prev => { const next = new Set(prev); next.add(activePoiId); return next; });
    try { navigator.vibrate?.(150); } catch {}
  }, [activePoiId, shownPoiId, dismissedPoiId, visited]);

  // Når vi forlader et POI (activePoiId -> null) eller går til et andet POI,
  // må auto-open gerne virke igen (reset dismissed).
  useEffect(() => {
    if (!activePoiId && dismissedPoiId !== null) {
      setDismissedPoiId(null);
    }
    if (activePoiId && dismissedPoiId !== null && dismissedPoiId !== activePoiId) {
      setDismissedPoiId(null);
    }
  }, [activePoiId, dismissedPoiId]);

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

  useEffect(() => {
  if (!shownPoi && downgradePendingRef.current) {
    setMode("manual");
    downgradePendingRef.current = false;
    badSinceRef.current = null;
  }
  }, [shownPoi]);

  /* Beregn “næste” og et lille segment (aktuelt til næste) – GPS-uafhængigt */
  const nextIndex = useMemo(() => {
    if (orderedPois.length < 2) return null;
    return Math.min(currentIndex + 1, orderedPois.length - 1);
  }, [currentIndex, orderedPois]);

  const nextSegment = useMemo(() => {
    if (nextIndex == null) return null;
    const from = orderedPois[currentIndex];
    const to = orderedPois[nextIndex];
    if (!from || !to || from.id === to.id) return null;
    return [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ] as [[number, number], [number, number]];
  }, [orderedPois, currentIndex, nextIndex]);


  function startGeoWatch() {
    if (!hasGeo) return;
    if (watchRef.current != null) {
      try { navigator.geolocation.clearWatch(watchRef.current); } catch {}
      watchRef.current = null;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(false);
        const cur: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const acc = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;

        setUserPos(cur);
        setAccuracyM(acc);

        // Glat buffer (til visning/geofence)
        setPosBuffer(prev => {
          const next = [...prev, cur];
          if (next.length > SMOOTH_N) next.shift();
          return next;
        });

        const now = Date.now();

        // --- dårlig-GPS overvågning (til fallback) ---
        if (acc != null && acc >= ACCURACY_BAD_THRESHOLD) {
          if (badSinceRef.current == null) badSinceRef.current = now;
        } else {
          badSinceRef.current = null;
        }

        // --- stabilitets-sampling (auto-opgradering) ---
        // hold kun samples i STABLE_WINDOW_MS
        stabBufRef.current = stabBufRef.current.filter(s => now - s.ts <= STABLE_WINDOW_MS);

        const good = acc != null && acc <= GOOD_ACC_THRESHOLD;
        if (good) {
          stabBufRef.current.push({ lat: cur[0], lon: cur[1], acc, ts: now });
        }

        if (mode !== "auto") {
          // forsøg at opgradere til auto
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
              setMode("warming"); // visuel hint om at vi leder efter godt signal
            }
          } else if (mode === "manual" && (acc ?? 9999) < 9999) {
            setMode("warming");
          }
        } else {
          // i auto-tilstand: evaluer om vi skal fallback til manual ved vedvarende dårlig GPS
          if (badSinceRef.current != null && now - badSinceRef.current >= BAD_PERSIST_MS) {
            if (shownPoi == null) {
              setMode("manual");
              badSinceRef.current = null;
            } else {
              downgradePendingRef.current = true; // vent til overlay er lukket
            }
          }
        }
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 }
    );
  }

function requestGpsPermissionOnce() {
  if (!hasGeo) return;
  setGpsRequesting(true);

  navigator.geolocation.getCurrentPosition(
    () => {
      setGpsError(false);
      setGpsRequesting(false);
      // after permission granted, start the continuous watch
      startGeoWatch();
    },
    () => {
      // still blocked/denied or failed
      setGpsError(true);
      setGpsRequesting(false);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

const isIOS = typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/i.test(navigator.userAgent) ||
   (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1));
  

const firstPoi = orderedPois[0] ?? null;

const shouldShowManualStart =
  !shownPoi &&
  !!firstPoi &&
  !visited.has(firstPoi.id) &&
  mode !== "auto";

  // Preload næste POI's billede
  useEffect(() => {
    const next = orderedPois[currentIndex + 1];
    const src = next?.images?.[0];
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [currentIndex, orderedPois]);

  // Preload næste POI's lyd
  useEffect(() => {
    const next = orderedPois[currentIndex + 1];
    const audioSrc = (next as any)?.audio as string | undefined;
    if (!audioSrc) return;
    const a = new Audio();
    a.preload = "auto";
    a.src = audioSrc;
  }, [currentIndex, orderedPois]);

  // Gem run-state i sessionStorage
  useEffect(() => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      cursorIndex,
      visited: [...visited],
      shownPoiId: shownPoiId ?? null,
      v: 1
    }));
  } catch {}
}, [STORAGE_KEY, cursorIndex, visited, shownPoiId]);


  // Global Header: titel + mute-knap + overlay-variant
  const { /* eslint-disable-line @typescript-eslint/no-unused-vars */ } = { };
  useEffect(() => {
    setTitle(route?.title ?? "");
    setVariant("overlay");

    const btn = (
      <button
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? "Slå voiceover til" : "Slå voiceover fra"}
        className="mute-btn"
      >
        <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      </button>
    );
    setRightNode(btn);

    return () => {
      setTitle(null);
      setRightNode(null);
      setVariant("solid");
    };
  }, [route?.title, muted, setTitle, setRightNode, setVariant]);

  // UI-handlers
  const goPrev = () => {
    if (orderedPois.length === 0) return;
    const nextIdx = Math.max(0, currentIndex - 1);
    setCursorIndex(nextIdx); // <-- keep progress when overlay closes
    setShownPoiId(orderedPois[nextIdx].id);
    setVisited(prev => new Set(prev).add(orderedPois[nextIdx].id));
  };

  const goNext = () => {
    if (orderedPois.length === 0) return;
    const nextIdx = Math.min(orderedPois.length - 1, currentIndex + 1);
    setCursorIndex(nextIdx); // <-- keep progress when overlay closes
    setShownPoiId(orderedPois[nextIdx].id);
    setVisited(prev => new Set(prev).add(orderedPois[nextIdx].id));
  };

  // Stop ruten og gå tilbage + clear sessionStorage
  const stopRun = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    window.history.back();
  };

  return (
    <section style={{ position: "relative" }}>
      {/* KORT (fullscreen; Header ligger som overlay) */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <MapView
          pois={orderedPois}
          polyline={route?.polyline ?? []}
          userPos={userPos ?? undefined}   // blå cirkel kan stadig være “live”
          boundsKey={routeId}
          nextSegment={nextSegment}        // animeret retning
        />
      </div>

          {/* GPS-advarsel */}
          {geoError && (
            <div
              style={{
                position: "fixed",
                left: "50%",
                transform: "translateX(-50%)",
                top: "calc(var(--headerH, 76px) + 8px)",
                zIndex: 80,
                maxWidth: "min(720px, calc(100vw - 24px))",
                background: "rgba(0,0,0,.65)",
                border: "1px solid rgba(255,200,0,.55)",
                color: "#fff",
                padding: "10px 12px",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,.25)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <div>
                <strong>{t("gps.warningTitle")}</strong>: {t("gps.couldNotGet")}
              </div>
              {/* Show "Aktivér GPS" only until first click */}
              {!gpsBtnClicked && (
                <button
                  onClick={() => {
                    setGpsBtnClicked(true);   // hide button immediately after click
                    requestGpsPermissionOnce();
                  }}
                  disabled={gpsRequesting}
                  style={{
                    marginLeft: 8,
                    minHeight: 32,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#1e66ff",
                    color: "#fff",
                    cursor: gpsRequesting ? "default" : "pointer",
                    opacity: gpsRequesting ? 0.8 : 1
                  }}
                >
                  {gpsRequesting ? (t("gps.requesting") ?? "Beder om lokation…")
                                : (t("gps.enableBtn")   ?? "Aktivér GPS")}
                </button>
              )}
                {isIOS && !gpsBtnClicked && (
                <small style={{ opacity: 0.9 }}>{t("gps.iosHint")}</small>
              )}
            </div>
          )}
          {showAutoToast && (
        <div style={{
          position: "fixed",
          left: "50%", transform: "translateX(-50%)",
          top: "calc(var(--headerH, 76px) + 48px)",
          zIndex: 85,
          background: "rgba(16,185,129,.95)",
          color: "#fff",
          borderRadius: 10,
          padding: "8px 12px",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)"
        }}>
          {t("gps.autoOn") ?? "GPS stabil – automatisk guiding er slået til"}
        </div>
      )}
      {/* Vis current GPS accuracy – hjælper i support/felt */}
      {accuracyM != null && (
      <div
        style={{
          position: "fixed",
          right: 12,
          top: 56,
          zIndex: 60,
          background: "rgba(0,0,0,.55)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: 8,
          padding: "6px 10px"
        }}
      >
        GPS {accuracyM != null ? `±${Math.round(accuracyM)} m` : "—"} • {
          mode === "auto"    ? (t("gps.modeAuto")    ?? "Auto")
        : mode === "warming" ? (t("gps.modeWarming") ?? "Finder signal…")
                            : (t("gps.modeManual")  ?? "Manuel")
        }
      </div>
      )}

      {/* Manuel start-knap (hvis GPS ikke virker eller er meget unøjagtig) */}
      {shouldShowManualStart && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 112,
            display: "flex",
            justifyContent: "center",
            zIndex: 60
          }}
        >
          <button
            onClick={() => {
              if (!firstPoi) return;
              setCursorIndex(0);
              setShownPoiId(firstPoi.id);
              setVisited(prev => { const next = new Set(prev); next.add(firstPoi.id); return next; });
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: "#1d4ed8",
              color: "white",
              fontSize: 16,
              boxShadow: "0 6px 20px rgba(0,0,0,.25)"
            }}
          >
            {t("run.start", { title: firstPoi?.title ?? "" })}
          </button>
        </div>
      )}

      {/* BOTTOMBAR */}
      <nav
        aria-label="Rutekontrol"
        className="route-bottombar-safe"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70,
          display: "grid", gridTemplateColumns: "auto 1fr", gap: 10,
          alignItems: "center",
          padding: "8px 10px",
          background: "rgba(20,20,20,.95)",
          borderTop: "1px solid rgba(255,255,255,.14)"
        }}
      >
        {/* Venstre: Stop skjules på sidste stop */}
        {!isLast && (
          <button
            onClick={stopRun}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)", background: "#c93a3a", color: "#fff"
            }}
          >
            {t("run.stop")}
          </button>
        )}

      <div style={{ display: "grid", gridAutoFlow: "column", gap: 8, alignItems: "center", justifyContent: "end" }}>
        {/* Åbn fortælling igen – kun når man står i et POI, har lukket overlayet og vi IKKE viser manual-start */}
        {activePoi && !shownPoi && !shouldShowManualStart && (
          <button
            onClick={() => {
              if (!activePoi) return;
              setShownPoiId(activePoi.id);
              setVisited(prev => new Set(prev).add(activePoi.id));
            }}
            style={{
              minHeight: 44,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              background: "transparent",
              color: "#fff",
              opacity: 0.9
            }}
          >
            {t("run.reopen")}
          </button>
        )}

        {!isFirst && (
          <button
            onClick={goPrev}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
          >
            {t("run.prev")}
          </button>
        )}

        <div style={{ color: "#cfcfcf", minWidth: 44, textAlign: "center" }}>{progressText}</div>

        {/* Frem skjules hvis manual start vises; ellers vis. På sidste stop viser vi i stedet Afslut */}
        {isLast ? (
          <button
            onClick={stopRun}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#c93a3a", color: "#fff" }}
          >
            {t("run.finish")}
          </button>
        ) : (
          !shouldShowManualStart && (
            <button
              onClick={goNext}
              style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
            >
              {t("run.next")}
            </button>
          )
        )}
      </div>
      </nav>

      {/* Overlay med fortælling */}
      {shownPoi && (
        <StoryOverlay
          poi={shownPoi}
          onClose={() => {
            // Husker at brugeren lukkede denne fortælling, så vi ikke auto-åbner den igen, mens de stadig står i samme POI
            setDismissedPoiId(shownPoi.id);
            setShownPoiId(null);
          }}
        />
      )}
    </section>
  );
}
