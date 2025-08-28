import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadRoutes } from "../lib/data";
import type { Route } from "../lib/data";
import ErrorBanner from "../components/ErrorBanner";

export default function RoutesList() {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoutes()
      .then(setRoutes)
      .catch((e) => {
        console.error(e);
        setError("Kunne ikke hente ruter. Tjek netforbindelsen og prøv igen.");
        setRoutes([]);
      });
  }, []);

  if (!routes && !error) return <p>Henter ruter…</p>;

  return (
    <section>
      <h2>Ruter</h2>

      {error && <ErrorBanner message={error} />}

      {routes && routes.length === 0 && !error && (
        <p>Ingen ruter fundet.</p>
      )}

      <ul>
        {routes?.map((r) => (
          <li key={r.id} style={{ marginBottom: 12 }}>
            <strong>{r.title}</strong>
            <div>
              {r.summary ? (
                <span>{r.summary}</span>
              ) : (
                <em>(TODO: tilføj rute-summary)</em>
              )}
            </div>
            <div>
              {typeof r.lengthMeters === "number" ? (
                <span>{(r.lengthMeters / 1000).toFixed(1)} km</span>
              ) : (
                <em>(TODO: længde)</em>
              )}
              {r.storyteller ? (
                <span> • Fortæller: {r.storyteller}</span>
              ) : null}
            </div>
            <div style={{ marginTop: 6 }}>
              <Link to={`/routes/${r.id}`}>Detaljer</Link>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <Link to="/">Til forsiden</Link>
      </div>
    </section>
  );
}
