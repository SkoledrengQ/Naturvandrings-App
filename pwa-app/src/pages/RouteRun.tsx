// src/pages/RouteRun.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { loadRoutes } from "../lib/data";
import { loadPoisByRoute } from "../lib/loadPois";
import type { Route, Poi } from "../lib/data";
import MapView from "../components/MapView";
import StoryOverlay from "../components/StoryOverlay";
import { useHeader } from "../contexts/HeaderContext";
import { useLanguage } from "../contexts/LanguageContext";
import useWakeLock from "../hooks/useWakeLock";
import { useGps } from "../hooks/useGps";
import { useGeofence } from "../hooks/useGeofence";
import { distanceMeters } from "../lib/geo";
import GpsBanner from "../components/route/GpsBanner";
import BottomBar from "../components/route/BottomBar";

const AUTO_OPEN_ON_ENTER = true; // Story overlay auto popup

export default function RouteRun() {
  const { id } = useParams();
  const routeId = Number(id);
  const STORAGE_KEY = `run:${routeId}`;

  useWakeLock(true);

  // Data
  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);

  // Header (global)
  const { setTitle, setRightNode, setVariant } = useHeader();

  // i18n
  const { lang, t } = useLanguage();

  // Hent data (reloader når lang eller routeId ændres)
  useEffect(() => {
    loadRoutes(lang).then(rs => setRoute(rs.find(r => r.id === routeId) || null));
    loadPoisByRoute(routeId, lang).then(setPois).catch(console.error);
  }, [routeId, lang]);

  // Når routeId ændres, nulstil cursor til start
  const [cursorIndex, setCursorIndex] = useState(0);
  useEffect(() => { setCursorIndex(0); }, [routeId]);

  // Genindlæs run-state fra sessionStorage (cursor, visited, shown)
  const [shownPoiId, setShownPoiId] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
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

  // GPS via hook (samme logik som før)
  const {
    mode,
    userPos,
    accuracyM,
    geoError,
    gpsBtnClicked, setGpsBtnClicked,
    gpsRequesting,
    showAutoToast,
    isIOS,
    requestGpsPermissionOnce,
    smoothedPos,
    handleOverlayClosed
  } = useGps();

  // Map helpers (robust: cast IDs til number og fallback)
  const byId = useMemo(() => {
    const m = new Map<number, Poi>();
    for (const p of pois) {
      const key = Number((p as any).id);
      if (!Number.isNaN(key)) m.set(key, p);
    }
    return m;
  }, [pois]);

  const orderedPois = useMemo(() => {
    const orderAny = (route as any)?.poiOrder;
    const order = Array.isArray(orderAny) ? orderAny : [];

    if (order.length > 0) {
      const mapped = order
        .map((id: any) => byId.get(Number(id)))
        .filter(Boolean) as Poi[];
      if (mapped.length > 0) return mapped; // brug den planlagte rækkefølge
    }
    return pois; // fallback: fil-rækkefølge
  }, [route, byId, pois]);

  // Geofence via hook (dwell/hysterese uændret)
  const { activePoiId } = useGeofence(mode, smoothedPos, orderedPois, accuracyM, visited);

  // Hvis vi har en aktiv POI, så sæt cursor til den
  useEffect(() => {
    if (!activePoiId) return;
    const idx = orderedPois.findIndex(p => p.id === activePoiId);
    if (idx >= 0) setCursorIndex(idx);
  }, [activePoiId, orderedPois]);

  // Auto-åbn overlay ved enter (samme adfærd)
  const [dismissedPoiId, setDismissedPoiId] = useState<number | null>(null);
  useEffect(() => {
    if (!AUTO_OPEN_ON_ENTER) return;
    if (!activePoiId) return;
    if (shownPoiId != null && shownPoiId !== activePoiId) return;
    if (dismissedPoiId === activePoiId) return;
    if (visited.has(activePoiId)) return;

    setShownPoiId(activePoiId);
    setVisited(prev => { const next = new Set(prev); next.add(activePoiId); return next; });
    try { navigator.vibrate?.(150); } catch {}
  }, [activePoiId, shownPoiId, dismissedPoiId, visited]);

  // Reset dismissed-markør
  useEffect(() => {
    if (!activePoiId && dismissedPoiId !== null) setDismissedPoiId(null);
    if (activePoiId && dismissedPoiId !== null && dismissedPoiId !== activePoiId) setDismissedPoiId(null);
  }, [activePoiId, dismissedPoiId]);

  // Afledte værdier til UI
  const activePoi = activePoiId ? byId.get(activePoiId) ?? null : null;
  const shownPoi  = shownPoiId ? byId.get(shownPoiId) ?? null : null;

  const currentIndex = useMemo(() => {
    const pickId = shownPoiId ?? activePoiId;
    if (pickId != null) {
      const idx = orderedPois.findIndex(p => p.id === pickId);
      if (idx >= 0) return idx;
    }
    return Math.min(cursorIndex, Math.max(orderedPois.length - 1, 0));
  }, [shownPoiId, activePoiId, cursorIndex, orderedPois]);

  const isFirst = currentIndex === 0;
  const isLast  = orderedPois.length > 0 && currentIndex === orderedPois.length - 1;

  const progressText = t("run.progress", {
    cur: Math.min(currentIndex + 1, Math.max(orderedPois.length, 1)),
    total: Math.max(orderedPois.length, 1),
  });

  // “Næste-segment” (GPS-uafhængigt)
  const nextIndex = useMemo(() => {
    if (orderedPois.length < 2) return null;
    return Math.min(currentIndex + 1, orderedPois.length - 1);
  }, [currentIndex, orderedPois]);

  const nextSegment = useMemo(() => {
    if (nextIndex == null) return null;
    const from = orderedPois[currentIndex];
    const to   = orderedPois[nextIndex];
    if (!from || !to || from.id === to.id) return null;
    return [
      [from.lat, (from as any).lon ?? (from as any).lng ?? from.lon],
      [to.lat,   (to   as any).lon ?? (to   as any).lng ?? to.lon],
    ] as [[number, number], [number, number]];
  }, [orderedPois, currentIndex, nextIndex]);

  // Preload næste POI-billede/lyd
  useEffect(() => {
    const next = orderedPois[currentIndex + 1];
    const src = (next as any)?.images?.[0];
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [currentIndex, orderedPois]);

  useEffect(() => {
    const next = orderedPois[currentIndex + 1];
    const audioSrc = (next as any)?.audio as string | undefined;
    if (!audioSrc) return;
    const a = new Audio();
    a.preload = "auto";
    a.src = audioSrc;
  }, [currentIndex, orderedPois]);

  // Gem run-state
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

  // Global Header
  useEffect(() => {
    setTitle(route?.title ?? "");
    setVariant("overlay");
    return () => {
      setTitle(null);
      setRightNode(null);
      setVariant("solid");
    };
  }, [route?.title, setTitle, setRightNode, setVariant]);

  // UI-handlers
  const goPrev = () => {
    if (orderedPois.length === 0) return;
    const nextIdx = Math.max(0, currentIndex - 1);
    setCursorIndex(nextIdx);
    setShownPoiId(orderedPois[nextIdx].id);
    setVisited(prev => new Set(prev).add(orderedPois[nextIdx].id));
  };

  const goNext = () => {
    if (orderedPois.length === 0) return;
    const nextIdx = Math.min(orderedPois.length - 1, currentIndex + 1);
    setCursorIndex(nextIdx);
    setShownPoiId(orderedPois[nextIdx].id);
    setVisited(prev => new Set(prev).add(orderedPois[nextIdx].id));
  };

  const stopRun = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    window.history.back();
  };

  // Første POI + startlogik
  const firstPoi = orderedPois[0] ?? null;
  function startFirst() {
    if (!firstPoi) return;
    setCursorIndex(0);
    setShownPoiId(firstPoi.id);
    setVisited(prev => { const next = new Set(prev); next.add(firstPoi.id); return next; });
  }

  // Tidl. "ManualStart" betingelse (ingen overlay åbent, ikke besøgt første, og ikke auto-mode)
  const shouldShowManualStart =
    !shownPoi &&
    !!firstPoi &&
    !visited.has(firstPoi.id) &&
    mode !== "auto";

  // 3 km-regel når GPS er aktiv (auto)
  const distanceToFirstM = useMemo(() => {
    if (!firstPoi || !userPos) return null;
    const lon =
      (firstPoi as any).lon ??
      (firstPoi as any).lng ??
      firstPoi.lon;
    // distanceMeters forventer [lat, lon] tuples
    return distanceMeters([userPos[0], userPos[1]], [firstPoi.lat, lon]);
  }, [firstPoi, userPos]);

  // “Start” i stedet for “Frem” når:
  // - vi ellers ville have vist den gamle midter-knap (shouldShowManualStart), eller
  // - GPS er auto og man er > 3 km fra første POI (hjemmetest)
  const showStartInsteadOfNext =
    (!!firstPoi) && (
      shouldShowManualStart ||
      (mode === "auto" && distanceToFirstM != null && distanceToFirstM > 3000 && !shownPoi)
    );

  return (
    <section style={{ position: "relative" }}>
      {/* KORT (fullscreen; Header ligger som overlay) */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <MapView
          pois={orderedPois}
          polyline={route?.polyline ?? []}
          userPos={userPos ?? undefined}
          boundsKey={routeId}
          nextSegment={nextSegment}
        />
      </div>

      {/* GPS-advarsel → GpsBanner */}
      <GpsBanner
        visible={!!geoError}
        title={t("gps.warningTitle")}
        message={t("gps.couldNotGet")}
        requestingLabel={t("gps.requesting") ?? "Beder om lokation…"}
        enableLabel={t("gps.enableBtn") ?? "Aktivér GPS"}
        iosHint={t("gps.iosHint")}
        gpsBtnClicked={gpsBtnClicked}
        gpsRequesting={gpsRequesting}
        isIOS={isIOS}
        onActivate={requestGpsPermissionOnce}
        onAfterClick={() => setGpsBtnClicked(true)}
      />

      {/* Auto-toast (beholdt) */}
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

      {/* Accuracy-badge (beholdt) */}
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

      {/* Nederste bar → BottomBar (nu også "Start" når relevant) */}
      <BottomBar
        isFirst={isFirst}
        isLast={isLast}
        progressText={progressText}
        canReopen={!!activePoi && !shownPoi && !shouldShowManualStart}
        onPrev={goPrev}
        onNext={showStartInsteadOfNext ? startFirst : goNext}
        onStop={stopRun}
        onFinish={stopRun}
        onReopen={() => {
          if (!activePoi) return;
          setShownPoiId(activePoi.id);
          setVisited(prev => new Set(prev).add(activePoi.id));
        }}
        prevLabel={t("run.prev")}
        nextLabel={showStartInsteadOfNext ? t("run.startShort") : t("run.next")}
        stopLabel={t("run.stop")}
        finishLabel={t("run.finish")}
        reopenLabel={t("run.reopen")}
        nextPrimary={showStartInsteadOfNext}
      />

      {/* Overlay med fortælling (uændret) */}
      {shownPoi && (
        <StoryOverlay
          poi={shownPoi}
          onClose={() => {
            setDismissedPoiId(shownPoi.id);
            setShownPoiId(null);
            // important: fuldfør evt. udskudt nedgradering til manual
            handleOverlayClosed();
          }}
        />
      )}
    </section>
  );
}
