import { Link } from "react-router-dom";

export default function RoutesList() {
  return (
    <section>
      <h2>Ruteoversigt</h2>
      <p>Her vil vi senere vise en liste af ruter fra JSON.</p>
      <Link to="/routes/1">Eksempel: Rutedetalje</Link>
      <Link to="/">Tilbage til forsiden</Link><br/>
    </section>
  );
}
