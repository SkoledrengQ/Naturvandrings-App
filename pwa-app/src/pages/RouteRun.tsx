import { Link, useParams } from "react-router-dom";

export default function RouteRun() {
  const { id } = useParams();

  return (
    <section>
      <h2>Kører rute {id}</h2>
      <p>Her kommer kortet og POI’er senere.</p>
      <Link to={`/routes/${id}`}>Stop og tilbage til detaljer</Link>
    </section>
  );
}
