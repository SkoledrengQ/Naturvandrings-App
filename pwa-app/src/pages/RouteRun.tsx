import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import { insideRadius } from "../lib/geo";
import MapView from "../components/MapView";
import StoryOverlay from "../components/StoryOverlay";
import { useHeader } from "../contexts/HeaderContext";
import { useLanguage } from "../contexts/LanguageContext";

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

/** Beregn effektiv enter-radius (POI override vs. GPS accuracy) */
function effectiveEnterRadius(p: Poi, acc: number | null) {
  const base = p.radiusMeters ?? ENTER_MIN_RADIUS;
  const accInflated = Math.ceil((acc ?? ENTER_MIN_RADIUS) * ACC_MULTIPLIER);
  return Math.max(base, accInflated);
}

export default function RouteRun() {
  const { id } = useParams();
  const routeId = Number(id);

  // Data
  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);

  // GPS
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [geoError, setGpsError] = useState(false);

  // UI/state
  const [muted, setMuted] = useState(false);

  // Header (global)
  const { setTitle, setRightNode, setVariant } = useHeader();

  // POI-state
  const [activePoiId, setActivePoiId] = useState<number | null>(null); // aktuelt “inde i”
  const [shownPoiId, setShownPoiId] = useState<number | null>(null);   // overlay åbent

  // Smooth buffer til geofence (mod jitter)
  const [posBuffer, setPosBuffer] = useState<[number, number][]>([]);
  const smoothedPos = useMemo(() => {
    if (posBuffer.length === 0) return null;
    const lat = posBuffer.reduce((s, p) => s + p[0], 0) / posBuffer.length;
    const lon = posBuffer.reduce((s, p) => s + p[1], 0) / posBuffer.length;
    return [lat, lon] as [number, number];
  }, [posBuffer]);

  // Hent data
  useEffect(() => {
    loadRoutes().then(rs => setRoute(rs.find(r => r.id === routeId) || null));
    loadPois().then(all => setPois(all.filter(p => p.routeId === routeId)));
  }, [routeId]);

  // GPS watch
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsError(true);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(false);
        const cur: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(cur);
        setAccuracyM(typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null);

        // Opbyg glat buffer til geofence (ikke til kort-markør hvis du vil have den super “live”)
        setPosBuffer(prev => {
          const next = [...prev, cur];
          if (next.length > SMOOTH_N) next.shift();
          return next;
        });
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Map helpers
  const byId = useMemo(() => new Map(pois.map(p => [p.id, p])), [pois]);

  const orderedPois = useMemo(() => {
    const ids = route?.poiOrder ?? [];
    return ids.map(id => byId.get(id)).filter(Boolean) as Poi[];
  }, [route, byId]);

  // Dwell-states (for kandidat der netop er “inde i” enter-radius)
  const [dwellTargetId, setDwellTargetId] = useState<number | null>(null);
  const [dwellStart, setDwellStart] = useState<number | null>(null);

  // Geofence (dynamisk enter, hysterese exit, dwell)
  useEffect(() => {
    if (!smoothedPos || orderedPois.length === 0) {
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

    // Find første POI i rækkefølgen, hvor vi er inde i enter-radius
    let candidate: Poi | null = null;
    for (const p of orderedPois) {
      const enterR = effectiveEnterRadius(p, accuracyM);
      const dist = distanceMeters(smoothedPos, [p.lat, p.lon]);
      if (dist <= enterR) {
        candidate = p;
        break;
      }
    }

    if (!candidate) {
      // Ikke inde i nogen – nulstil dwell men bevar aktiv=null (håndteres ovenfor)
      setDwellTargetId(null);
      setDwellStart(null);
      return;
    }

    // Dwell logik – vi er inde i kandidatens enter-radius
    if (dwellTargetId !== candidate.id) {
      setDwellTargetId(candidate.id);
      setDwellStart(performance.now());
      return;
    }

    // Samme kandidat – tjek om dwell-tiden er opfyldt
    const now = performance.now();
    if (dwellStart && now - dwellStart >= DWELL_MS) {
      setActivePoiId((prev) => (prev === candidate!.id ? prev : candidate!.id));
      // Når vi bliver aktive, kan vi nulstille dwell
      setDwellStart(now);
    }
  }, [smoothedPos, accuracyM, orderedPois, activePoiId, byId]);

  // Afledte værdier
  const activePoi = activePoiId ? byId.get(activePoiId) ?? null : null;
  const shownPoi  = shownPoiId ? byId.get(shownPoiId) ?? null : null;

  const currentIndex = useMemo(() => {
    const idToShow = shownPoiId ?? activePoiId;
    if (!idToShow) return 0;
    const idx = orderedPois.findIndex(p => p.id === idToShow);
    return idx >= 0 ? idx : 0;
  }, [shownPoiId, activePoiId, orderedPois]);

  // Sprogtekst
  const { t } = useLanguage();
  const progressText = t("run.progress", {
    cur: Math.min(currentIndex + 1, Math.max(orderedPois.length, 1)),
    total: Math.max(orderedPois.length, 1),
  });

  /* >>> NYT: beregn “næste” og et lille segment (aktuelt → næste) – GPS-uafhængigt */
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
  /* <<< NYT SLUT */

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
    setShownPoiId(orderedPois[nextIdx].id);
  };

  const goNext = () => {
    if (orderedPois.length === 0) return;
    const nextIdx = Math.min(orderedPois.length - 1, currentIndex + 1);
    setShownPoiId(orderedPois[nextIdx].id);
  };

  const stopRun = () => {
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
          nextSegment={nextSegment}        // <<< NYT: animeret retning
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
          }}
        >
          <strong>{t("gps.warningTitle")}</strong>: {t("gps.couldNotGet")}
        </div>
      )}

      {/* Vis current GPS accuracy – hjælper i support/felt */}
      {accuracyM != null && (
        <div
          style={{
            position: "fixed", right: 12, top: 56, zIndex: 60,
            background: "rgba(0,0,0,.55)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.18)",
            borderRadius: 8,
            padding: "6px 10px"
          }}
        >
          GPS ±{Math.round(accuracyM)} m
        </div>
      )}

      {/* “Start fortælling” hvis i radius men overlay ikke åbent */}
      {activePoi && !shownPoi && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 112, display: "flex", justifyContent: "center", zIndex: 60 }}>
          <button
            onClick={() => setShownPoiId(activePoi.id)}
            style={{
              padding: "12px 16px", borderRadius: 12, border: "none",
              background: "#1d4ed8", color: "white", fontSize: 16,
              boxShadow: "0 6px 20px rgba(0,0,0,.25)"
            }}
          >
          {t("run.start", { title: activePoi.title })}
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
        <button
          onClick={stopRun}
          style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#c93a3a", color: "#fff" }}
        >
          {t("run.stop")}
        </button>

        <div style={{ display: "grid", gridAutoFlow: "column", gap: 8, alignItems: "center", justifyContent: "end" }}>
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
          >
            {t("run.prev")}
          </button>
          <div style={{ color: "#cfcfcf", minWidth: 44, textAlign: "center" }}>{progressText}</div>
          <button
            onClick={goNext}
            disabled={currentIndex >= orderedPois.length - 1}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
          >
            {t("run.next")}
          </button>
        </div>
      </nav>

      {/* Overlay med fortælling */}
      {shownPoi && (
        <StoryOverlay
          poi={shownPoi}
          onClose={() => setShownPoiId(null)}
        />
      )}
    </section>
  );
}
