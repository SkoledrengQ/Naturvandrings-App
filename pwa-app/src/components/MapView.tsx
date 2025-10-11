import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import type { Poi } from "../lib/data";
import "leaflet/dist/leaflet.css";

/* Default marker (retina-sikker) */
const PoiDivIcon = L.divIcon({
  className: "poi-pin",
  iconSize: [18, 24],
  iconAnchor: [9, 24], // spidsen nederst-midt
  html: `
    <svg width="18" height="24" viewBox="0 0 18 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 24s7-8.4 7-14.1C16 4.4 12.9 1 9 1S2 4.4 2 9.9C2 15.6 9 24 9 24z"
            fill="#dc2626" stroke="white" stroke-width="1"/>
      <circle cx="9" cy="9.5" r="3.2" fill="white"/>
    </svg>
  `,
});
const PoiIcon = L.divIcon(PoiDivIcon.options);

type Props = {
  pois: Poi[];
  polyline?: [number, number][];
  userPos?: [number, number] | null;
  /** Giv rute-id her, så fitBounds kun sker én gang pr. rute */
  boundsKey?: string | number;
  /** NYT (valgfri): lille animeret segment fra aktuelt → næste */
  nextSegment?: [[number, number], [number, number]] | null;
};

function FitBoundsOnce({
  pois,
  polyline,
  boundsKey,
}: {
  pois: Poi[];
  polyline?: [number, number][];
  boundsKey?: string | number;
}) {
  const map = useMap();
  const didRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    // Kun kør hvis vi har en ny rute-id
    if (didRef.current === boundsKey) return;

    const pts: L.LatLngExpression[] = [];
    pois.forEach((p) => pts.push([p.lat, p.lon]));
    if (polyline?.length) pts.push(...polyline);

    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts).pad(0.2);
      map.fitBounds(bounds); // zoom ind på ruten
    } else {
      // fallback – Aalborg-ish center
      map.setView([56.1629, 10.2039], 7);
    }

    didRef.current = boundsKey;

    // fix til tiles på mobil
    setTimeout(() => map.invalidateSize(), 0);
  }, [map, pois, polyline, boundsKey]);

  return null;
}

/** 2) Følg ALTID brugerens position – men glat (anti-flicker) */
function FollowUserSmooth({ userPos }: { userPos?: [number, number] | null }) {
  const map = useMap();
  const lastTargetRef = useRef<L.LatLng | null>(null);
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (!userPos) return;

    const now = performance.now();
    // Rate limit: max ~hver 700 ms
    if (now - lastTsRef.current < 700) return;

    const target = L.latLng(userPos[0], userPos[1]);
    const prev = lastTargetRef.current;

    // Afstandstærskel: kun pan ved > 8 meter bevægelse
    const movedEnough = !prev || map.distance(prev, target) > 8;

    if (movedEnough) {
      const z = map.getZoom() ?? 16;
      map.setView(target, Math.max(z, 16), { animate: true });
      lastTargetRef.current = target;
      lastTsRef.current = now;
    }
  }, [userPos, map]);

  return null;
}

export default function MapView({ pois, polyline, userPos, boundsKey, nextSegment }: Props) {
  // Zoom-interval
  const minZoom = 12;
  const maxZoom = 19;

  // Rute-bounds til at begrænse “verdens-hop” en smule (uden hård lås)
  const maxBounds = useMemo(() => {
    const pts: L.LatLngExpression[] = [];
    pois.forEach((p) => pts.push([p.lat, p.lon]));
    if (polyline?.length) pts.push(...polyline);
    if (pts.length === 0) return undefined;
    return L.latLngBounds(pts).pad(0.6); // lidt luft – føles ikke “låst”
  }, [pois, polyline]);

  return (
    <div
  style={{ position: "fixed", left: 0, right: 0, bottom: 0, top: "var(--headerH, 76px)", zIndex: 1, }}>
        <MapContainer
          center={[56, 10]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          maxBounds={maxBounds}
          maxBoundsViscosity={0.5}
          worldCopyJump={false}
          preferCanvas={true}
          zoomAnimation={false}
          markerZoomAnimation={false}
          touchZoom={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          zoomSnap={1}
          zoomDelta={1}
          wheelPxPerZoomLevel={120}
          zoomControl={false}           // ← slå default fra
        >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topleft" />

        {polyline && polyline.length > 1 && <Polyline positions={polyline} />}

        {pois.map((p, idx) => (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={PoiDivIcon}>
            <Popup>
              <strong>{idx + 1}. {p.title}</strong>
            </Popup>
          </Marker>
        ))}


        {userPos && <CircleMarker center={userPos} radius={6} />}

        <FitBoundsOnce pois={pois} polyline={polyline} boundsKey={boundsKey} />
        <FollowUserSmooth userPos={userPos} />
      </MapContainer>
    </div>
  );
}
