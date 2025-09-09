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

  useEffect(() => {
    Promise.all([loadRoutes(), loadPois()])
      .then(([routes, allPois]) => {
        const r = routes.find(x => x.id === routeId) ?? null;
        setRoute(r);
        setPois(allPois);
      })
      .catch((e) => {
        console.error(e);
        setError("Kunne ikke hente rute/POI-data.");
      });
  }, [routeId]);

  const orderedPois: Poi[] = useMemo(() => {
    if (!route || !pois) return [];
    const byId = new Map(pois.map(p => [p.id, p]));
    return (route.poiOrder ?? []).map(id => byId.get(id)).filter(Boolean) as Poi[];
  }, [route, pois]);

  const preview = useMemo(() => {
    if (!route) return { src: null as string | null, alt: "Rute-cover" };

    // 1) route.coverImage hvis den findes
    const rAny = route as any;
    if (rAny.coverImage) {
      return { src: rAny.coverImage as string, alt: rAny.coverImageAlt ?? route.title ?? "Rute-cover" };
    }

    // 2) Første POI i ordren med billede
    for (const p of orderedPois) {
      if (p.images && p.images.length > 0) {
        return { src: p.images[0]!, alt: p.title || route.title || "Rute-cover" };
      }
    }

    // 3) Sidste fallback: placeholder
    return { src: null, alt: route.title ?? "Rute-cover" };
  }, [route, orderedPois]);

  if (error) return <div className="container"><ErrorBanner message={error} /></div>;
  if (!route) return <div className="container">Indlæser rute…</div>;

  return (
    <div className="container">
      <div className="header-row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>{route.title}</h1>
        <div className="actions" style={{ margin: 0 }}>
          <Link to="/routes" className="btn">Tilbage</Link>
          <Link to={`/routes/${route.id}/run`} className="btn btn-primary">Start</Link>
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <div
          className="card-media blurfill"
          style={preview.src ? ({ ["--bg-image" as any]: `url(${preview.src})` }) : undefined}
        >
          <img
            src={preview.src ?? "/img/placeholder-route.webp"}
            alt={preview.alt}
            loading="lazy"
          />
        </div>
        <div className="card-body">
          {route.summary ? <p style={{ marginTop: 0 }}>{route.summary}</p> : null}

          <div className="badges">
            {typeof route.lengthMeters === "number" ? (
              <span className="badge">{(route.lengthMeters / 1000).toFixed(1)} km</span>
            ) : <span className="badge">Længde: ukendt</span>}
            {route.storyteller ? <span className="badge">Fortæller: {route.storyteller}</span> : null}
            {route.ageTarget ? <span className="badge">{route.ageTarget}</span> : null}
          </div>

          <hr className="hr" />

          <div className="kicker">Stop på ruten</div>
          {orderedPois.length === 0 ? (
            <p>Der er endnu ikke tilknyttet stop til ruten.</p>
          ) : (
            <ol className="poi-list">
              {orderedPois.map((p, i) => (
                <li key={p.id}>
                  {p.title}
                </li>
              ))}
            </ol>
          )}

          <div className="actions" style={{ marginTop: 16 }}>
            <Link to={`/routes/${route.id}/run`} className="btn btn-primary" style={{ minWidth: 160 }}>
              Start ruten
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
