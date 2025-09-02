import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import { insideRadius } from "../lib/geo";
import MapView from "../components/MapView";
import StoryOverlay from "../components/StoryOverlay";
import { useHeader } from "../contexts/HeaderContext";

export default function RouteRun() {
  const { id } = useParams();
  const routeId = Number(id);

  // Data
  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);

  // GPS
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // UI/state
  const [muted, setMuted] = useState(false);

  // Header (global)
  const { setTitle, setRightNode, setVariant } = useHeader();

  // POI-state
  const [activePoiId, setActivePoiId] = useState<number | null>(null); // i radius
  const [shownPoiId, setShownPoiId] = useState<number | null>(null);   // overlay vist

  // Hent data
  useEffect(() => {
    loadRoutes().then(rs => setRoute(rs.find(r => r.id === routeId) || null));
    loadPois().then(all => setPois(all.filter(p => p.routeId === routeId)));
  }, [routeId]);

  // GPS watch
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Din browser understøtter ikke geolocation.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setGeoError(null);
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      err => setGeoError(err.message || "Kunne ikke hente position."),
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

  // Geofence (uden 'mode')
  useEffect(() => {
    if (!userPos || orderedPois.length === 0) {
      setActivePoiId(null);
      return;
    }
    const found = orderedPois.find(p =>
      insideRadius(userPos, [p.lat, p.lon], p.radiusMeters ?? 12)
    );
    setActivePoiId(found ? found.id : null);
  }, [userPos, orderedPois]);

  // Afledte værdier
  const activePoi = activePoiId ? byId.get(activePoiId) ?? null : null;
  const shownPoi  = shownPoiId ? byId.get(shownPoiId) ?? null : null;

  const currentIndex = useMemo(() => {
    const idToShow = shownPoiId ?? activePoiId;
    if (!idToShow) return 0;
    const idx = orderedPois.findIndex(p => p.id === idToShow);
    return idx >= 0 ? idx : 0;
  }, [shownPoiId, activePoiId, orderedPois]);

  const progressText = `${Math.min(currentIndex + 1, Math.max(orderedPois.length, 1))}/${Math.max(orderedPois.length, 1)}`;

  // Global Header: titel + mute-knap + overlay-variant
  useEffect(() => {
    setTitle(route?.title ?? "");
    setVariant("overlay");

    const btn = (
      <button
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? "Slå voiceover til" : "Slå voiceover fra"}
        style={{
          width: 40, height: 40, borderRadius: 10,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(0,0,0,.5)", color: "#fff"
        }}
      >
        {muted ? "🔇" : "🔊"}
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
          userPos={userPos ?? undefined}
          boundsKey={routeId}
        />
      </div>

      {/* GPS-advarsel */}
      {geoError && (
        <div
          style={{
            position: "fixed", left: 12, right: 12, top: 56,
            background: "rgba(255,200,0,.15)", border: "1px solid rgba(255,200,0,.4)",
            color: "#fff", padding: 8, borderRadius: 10, zIndex: 60
          }}
        >
          GPS-advarsel: {geoError}
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
            Start fortælling: {activePoi.title}
          </button>
        </div>
      )}

      {/* BOTTOMBAR (uden “Følg mig”) */}
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
          Stop
        </button>

        <div style={{ display: "grid", gridAutoFlow: "column", gap: 8, alignItems: "center", justifyContent: "end" }}>
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
          >
            ← Tilbage
          </button>
          <div style={{ color: "#cfcfcf", minWidth: 44, textAlign: "center" }}>{progressText}</div>
          <button
            onClick={goNext}
            disabled={currentIndex >= orderedPois.length - 1}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff" }}
          >
            Frem →
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
