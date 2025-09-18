import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadRoutes, loadPois } from "../lib/data";
import type { Route, Poi } from "../lib/data";
import ErrorBanner from "../components/ErrorBanner";
import { useLanguage } from "../contexts/LanguageContext";

export default function RouteDetail() {
  const { id } = useParams();
  const routeId = Number(id);

  // i18n
  const { lang, t } = useLanguage();

  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<Poi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    let cancel = false;

    Promise.all([loadRoutes(lang), loadPois(lang)])
      .then(([routes, allPois]) => {
        if (cancel) return;
        const r = routes.find(x => x.id === routeId) ?? null;
        setRoute(r);
        setPois(allPois);
      })
      .catch((e) => {
        console.error(e);
        if (!cancel) setError(t("common.loadError"));
      });

  return () => { cancel = true; };
  }, [routeId, lang, t]);

  const orderedPois: Poi[] = useMemo(() => {
    if (!route || !pois) return [];
    const byId = new Map(pois.map(p => [p.id, p]));
    return (route.poiOrder ?? []).map(id => byId.get(id)).filter(Boolean) as Poi[];
  }, [route, pois]);

  const preview = useMemo(() => {
    if (!route) return { src: null as string | null, alt: t("route.coverAlt") };

    const rAny = route as any;
    if (rAny.coverImage) {
      return { src: rAny.coverImage as string, alt: rAny.coverImageAlt ?? route.title ?? t("route.coverAlt") };
    }

    for (const p of orderedPois) {
      if (p.images && p.images.length > 0) {
        return { src: p.images[0]!, alt: p.title || route.title || t("route.coverAlt") };
      }
    }

    return { src: null, alt: route.title ?? t("route.coverAlt") };
  }, [route, orderedPois, t]);

  if (error) return <div className="container"><ErrorBanner message={error} /></div>;
  if (!route) return <div className="container">{t("route.loading")}</div>;

  return (
    <div className="container">
      <div className="header-row" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>{route.title}</h1>
        <div className="actions" style={{ margin: 0 }}>
          <Link to="/routes" className="btn">{t("common.back")}</Link>
          <Link to={`/routes/${route.id}/run`} className="btn btn-primary">{t("common.start")}</Link>
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
            ) : <span className="badge">{t("routes.lengthUnknown")}</span>}
            {route.storyteller ? <span className="badge">{t("routes.storyteller")}: {route.storyteller}</span> : null}
            {route.ageTarget ? <span className="badge">{route.ageTarget}</span> : null}
            {/* ← NYT: difficulty-badge hvis sat */}
            {(route as any).difficulty ? (
              <span className="badge">⚠️ {(route as any).difficulty}</span>
            ) : null}
          </div>

          <hr className="hr" />

          <div className="kicker">{t("route.stopsTitle")}</div>
          {orderedPois.length === 0 ? (
            <p>{t("route.noStops")}</p>
          ) : (
            <ol className="poi-list">
              {orderedPois.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ol>
          )}

          <div className="actions" style={{ marginTop: 16 }}>
            <Link to={`/routes/${route.id}/run`} className="btn btn-primary" style={{ minWidth: 160 }}>
              {t("route.startRoute")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
