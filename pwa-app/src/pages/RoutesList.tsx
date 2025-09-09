import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import ErrorBanner from "../components/ErrorBanner";

type RouteCardModel = {
  route: Route;
  poiCount: number;
  previewImg: string | null;
  previewAlt: string;
};

export default function RoutesList() {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [pois, setPois] = useState<Poi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadRoutes(), loadPois()])
      .then(([r, p]) => {
        setRoutes(r);
        setPois(p);
      })
      .catch((e) => {
        console.error(e);
        setError("Kunne ikke hente ruter eller POI-data. Tjek netforbindelsen og prøv igen.");
      });
  }, []);

  const models: RouteCardModel[] | null = useMemo(() => {
    if (!routes || !pois) return null;

    const byId = new Map<number, Poi>(pois.map(p => [p.id, p]));
    const byRoute = new Map<number, Poi[]>();
    for (const p of pois) {
      const arr = byRoute.get(p.routeId) ?? [];
      arr.push(p);
      byRoute.set(p.routeId, arr);
    }

    const pickPreviewForRoute = (r: Route): { src: string | null; alt: string } => {
      // 1) Hvis coverImage er sat på ruten, brug den.
      if ((r as any).coverImage) {
        return { src: (r as any).coverImage as string, alt: (r as any).coverImageAlt ?? r.title };
      }

      // 2) Fallback: gå igennem r.poiOrder og find første POI med billeder
      const order = r.poiOrder ?? [];
      for (const id of order) {
        const p = byId.get(id);
        if (p?.images && p.images.length > 0) {
          return { src: p.images[0]!, alt: p.title || r.title };
        }
      }

      // 3) Sidste forsøg: find en vilkårlig POI for ruten med billeder
      const list = byRoute.get(r.id) ?? [];
      const withImg = list.find(p => p.images && p.images.length > 0);
      if (withImg) {
        return { src: withImg.images![0]!, alt: withImg.title || r.title };
      }

      // 4) Ingen billeder → brug placeholder
      return { src: null, alt: r.title };
    };

    return routes.map((r) => {
      const { src, alt } = pickPreviewForRoute(r);
      return {
        route: r,
        poiCount: (r.poiOrder ?? []).length,
        previewImg: src,
        previewAlt: alt,
      };
    });
  }, [routes, pois]);

  if (error) return <div className="container"><ErrorBanner message={error} /></div>;
  if (!models) return <div className="container">Indlæser ruter…</div>;

  return (
    <div className="container">
      <div className="header-row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Ruter</h1>
        <Link to="/" className="btn">Til forside</Link>
      </div>

      <div className="grid" role="list">
        {models.map(({ route, poiCount, previewImg, previewAlt }) => (
          <article key={route.id} className="card" role="listitem">
            <div
              className="card-media blurfill"
              style={previewImg ? ({ ["--bg-image" as any]: `url(${previewImg})` }) : undefined}
            >
              <img
                src={previewImg ?? "/img/placeholder-route.webp"}
                alt={previewAlt}
                loading="lazy"
              />
            </div>
            <div className="card-body">
              <h2 className="card-title">{route.title}</h2>
              <div className="card-meta">
                {poiCount} stop{poiCount === 1 ? "" : "s"}
                {route.storyteller ? <> • Fortæller: {route.storyteller}</> : null}
              </div>
              <div className="badges">
                {typeof route.lengthMeters === "number" ? (
                  <span className="badge">{(route.lengthMeters / 1000).toFixed(1)} km</span>
                ) : <span className="badge">Længde: ukendt</span>}
                {route.ageTarget ? <span className="badge">{route.ageTarget}</span> : null}
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <Link to={`/routes/${route.id}`} className="btn btn-primary">Detaljer</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
