import { Link, useParams } from "react-router-dom";

export default function RouteDetail() {
  const { id } = useParams();

  return (
    <section>
      <h2>Rute detaljer</h2>
      <p>Dette er detaljer for rute med id: {id}</p>
      <Link to="/routes">Tilbage til oversigt</Link><br/>
      <Link to={`/routes/${id}/run`}>Start ruten</Link>
    </section>
  );
}
