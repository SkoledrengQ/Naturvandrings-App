import { Link } from "react-router-dom";
import { useHeader } from "../contexts/HeaderContext";
import { useLayoutEffect, useRef } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Header() {
  const { title, rightNode, variant } = useHeader();
  const { lang, setLang, available } = useLanguage();
  const isOverlay = variant === "overlay";

  const HEADER_H = 76;
  const hdrRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const h = hdrRef.current
      ? Math.round(hdrRef.current.getBoundingClientRect().height)
      : HEADER_H;
    document.documentElement.style.setProperty("--headerH", `${h}px`);
    document.body.classList.add("header-padded");
    return () => { document.body.classList.remove("header-padded"); };
  }, []);

  return (
    <header
      ref={hdrRef}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: HEADER_H,
        zIndex: 100,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        background: isOverlay
          ? "linear-gradient(180deg, rgba(0,0,0,.45), transparent)"
          : "#111",
        borderBottom: isOverlay ? "none" : "1px solid rgba(255,255,255,.12)",
        boxSizing: "border-box",
      }}
    >
      {/* Venstre: logo */}
      <div>
        <Link to="/" aria-label="Gå til forsiden" style={{ display: "inline-flex", alignItems: "center" }}>
          <img src="/Logo.png" alt="Logo" style={{ height: 56, width: "auto", display: "block" }} />
        </Link>
      </div>

      {/* Midt: titel */}
      <div style={{ textAlign: "center", color: "#fff", fontWeight: 600 }}>
        {title}
      </div>

      {/* Højre: mute-knap fra sider der sætter rightNode – ellers sprogskifte */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {rightNode ?? (
          <div role="group" aria-label="Sprog"
               style={{ display: "inline-flex", gap: 6, background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 10, padding: "4px 6px" }}>
            {available.map(code => (
              <button key={code}
                onClick={() => setLang(code as any)}
                aria-pressed={lang === code}
                style={{
                  minWidth: 36,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: lang === code ? "#0a84ff" : "rgba(20,20,20,.6)",
                  color: "#fff",
                  cursor: "pointer"
                }}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
