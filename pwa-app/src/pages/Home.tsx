import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext"; // tilpas sti hvis nødvendig

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="container">
      <section className="hero">
        <div className="kicker">Dorf Møllegård</div>
        <h1>{t("home.hometitle")}</h1>
        <p>{t("home.homelead")}</p>
        <div className="actions">
          <Link to="/routes" className="btn btn-primary">
            {t("home.ctaRoutes")}
          </Link>
          <Link to="/about" className="btn">
            {t("home.ctaAbout")}
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 16 }} className="section">
        <div className="header-row">
          <h2 style={{ margin: 0 }}>{t("home.howTitle")}</h2>
        </div>
        <hr className="hr" />

        <ol className="poi-list">
          <li>
            {t("home.howStep1_pre")}{" "}
            <strong>{t("home.ctaRoutes")}</strong>
            {t("home.howStep1_post")}
          </li>

          <li>{t("home.howStep2")}</li>
          <li>{t("home.howStep3")}</li>

          <li>
            {t("home.howStep4_pre")}{" "}
            <strong>{t("home.start")}</strong>
            {t("home.howStep4_post")}
          </li>

          <li>{t("home.howStep5_gps")}</li>
          <li>{t("home.howStep6")}</li>
        </ol>
      </section>
    </div>
  );
}
