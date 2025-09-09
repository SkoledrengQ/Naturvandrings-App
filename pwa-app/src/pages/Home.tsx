import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div className="kicker">Dorf Møllegård</div>
        <h1>Udforsk Mølleskoven og historien bag landskabet</h1>
        <p>
          Tag på naturvandring og oplev fortællinger om istidens kræfter, randmoræner
          og livet omkring møllebækken. Vælg en rute og lad telefonen guide dig ved
          de markante steder i terrænet.
        </p>
        <div className="actions">
          <Link to="/routes" className="btn btn-primary">Se ruter</Link>
          <Link to="/about" className="btn">Om stedet</Link>
        </div>
      </section>

      <section style={{ marginTop: 16 }} className="section">
        <div className="header-row">
          <h2 style={{ margin: 0 }}>Sådan fungerer det</h2>
        </div>
        <hr className="hr" />
        <ol className="poi-list">
          <li>Vælg en rute under <strong>Se ruter</strong>.</li>
          <li>Gå til ruteudgangspunktet og tryk <strong>Start</strong>.</li>
          <li>Telefonen fortæller dig, når du står ved et interessant sted.</li>
        </ol>
      </section>
    </div>
  );
}
