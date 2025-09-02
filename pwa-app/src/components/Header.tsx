import { Link } from "react-router-dom";
import { useHeader } from "../contexts/HeaderContext";

export default function Header() {
  const { title, rightNode, variant } = useHeader();
  const isOverlay = variant === "overlay";
  const logoSrc = `${import.meta.env.BASE_URL}Logo.png`;

  return (
    <header
      className="header-safe"  // ← NYT
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        background: isOverlay
          ? "linear-gradient(180deg, rgba(0,0,0,.45), transparent)"
          : "#111",
        borderBottom: isOverlay ? "none" : "1px solid rgba(255,255,255,.12)"
      }}
    >
      <Link to="/" aria-label="Gå til forsiden">
        <img src={logoSrc} alt="Logo" style={{ height: 28, display: "block" }} />
      </Link>

      <div style={{ textAlign: "center", color: "#fff", fontWeight: 600 }}>
        {title}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {rightNode}
      </div>
    </header>
  );
}
