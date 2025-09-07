import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import ErrorBanner from "../components/ErrorBanner";

export default function RouteDetail() {
  const { id } = useParams();
  const routeId = Number(id);

  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hent route
  useEffect(() => {
    loadRoutes()
      .then((rs) => setRoute(rs.find((r) => r.id === routeId) ?? null))
      .catch((e) => {
        console.error(e);
        setError("Kunne ikke hente ruten.");
      });
  }, [routeId]);

  // Hent POIs
  useEffect(() => {
    loadPois()
      .then(setPois)
      .catch((e) => {
        console.error(e);
        setError("Kunne ikke hente punkter (POI).");
      });
  }, []);

  const routePois = useMemo(() => {
    if (!route || !pois) return [];
    const byId = new Map(pois.map((p) => [p.id, p]));
    return route.poiOrder
      .map((pid) => byId.get(pid))
      .filter(Boolean) as Poi[];
  }, [route, pois]);

  if (error) return (
    <section>
      <ErrorBanner message={error} />
      <Link to="/routes">Tilbage</Link>
    </section>
  );

  if (!route || !pois) return <p>Henter…</p>;
  if (!route) return <p>Rute ikke fundet.</p>;

  return (
    <section>
      <h2>{route.title}</h2>
      <p>{route.summary || <em>(TODO: tilføj rute-summary)</em>}</p>
      <p>
        {typeof route.lengthMeters === "number" ? (
          <span>{(route.lengthMeters / 1000).toFixed(1)} km</span>
        ) : (
          <em>(TODO: længde)</em>
        )}
        {route.storyteller ? (
          <span> • Fortæller: {route.storyteller}</span>
        ) : null}
      </p>

      <h3>Punkter på ruten</h3>
      {routePois.length === 0 ? (
        <p>Ingen punkter fundet for denne rute.</p>
      ) : (
        <ol>
          {routePois.map((p, i) => (
            <li key={p.id}>
            {p.title}
            </li>
          ))}
        </ol>
      )}

      <div style={{ marginTop: 12 }}>
        <Link to="/routes">Tilbage</Link>
        <Link to={`/routes/${route.id}/run`}> | Start</Link>{" "}
      </div>
    </section>
  );
}
