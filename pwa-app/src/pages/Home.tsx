import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section>
      <h1>Dorf Møllegård</h1>
      <p>Velkommen! Vælg en rute og kom ud i naturen.</p>
      <Link to="/routes">Se ruter</Link>
    </section>
  );
}
