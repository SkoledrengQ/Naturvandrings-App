import { useEffect, useState } from "react";
import type { Poi } from "../lib/data";

type MediaPoi = Poi & {
  text?: string;
  images?: string[];
  imageAlts?: string[];
  audio?: string;
};

type Props = { poi: MediaPoi; onClose: () => void };

/* NYT: små konstanter til sikker visning */
const SHOW_BOTTOM_CLOSE = false; // <- sæt til true hvis du vil have knap i bunden igen
const overlayPadding = {
  // Safe-area padding (iOS notch + Android bars)
  padding:
    "max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))",
};
// Brug 100dvh, men med fallback til 92vh for ældre browsere
const panelMaxHeight =
  "min(92vh, calc(100dvh - max(12px, env(safe-area-inset-top,0px)) - max(12px, env(safe-area-inset-bottom,0px))))";

export default function StoryOverlay({ poi, onClose }: Props) {
  const { title, text, images = [], imageAlts = [], audio } = poi;
  const [idx, setIdx] = useState(0);
  const count = images.length;

  // Keyboard: ESC luk, ←/→ navigér billeder
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (count > 1) {
        if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, count - 1));
        if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  const activeSrc = images[idx];
  const activeAlt = imageAlts[idx] || title || "Billede";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 999,
        display: "grid",
        placeItems: "center",
        /* NYT: safe-area padding */
        ...overlayPadding,
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          background: "#fff",
          color: "#111",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(16,24,40,.18)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto", // header, scroll-zone, footer
          /* NYT: fuld højde men under bars */
          maxHeight: panelMaxHeight,
          overflow: "hidden",
        }}
      >
        {/* Sticky header med tydelig luk-knap */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid #e6edf5",
            background: "#fbfdff",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="btn"
            style={{
              minHeight: 36,
              padding: "6px 12px",
              background: "#1e66ff",
              color: "#fff",
              borderColor: "#1a55d6",
            }}
          >
            Luk ✕
          </button>
        </div>

        {/* Scrollbart indhold (billeder + tekst + evt. lyd) */}
        <div
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch", // iOS glidende scroll
            padding: 12,
          }}
        >
          {/* Galleri */}
          {count > 0 && (
            <div>
              <div
                style={{
                  position: "relative",
                  background: "#ecf2f9",
                  border: "1px solid #dbe5f1",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <img
                  src={activeSrc}
                  alt={activeAlt}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
                {count > 1 && (
                  <>
                    <button
                      aria-label="Forrige billede"
                      onClick={() => setIdx((i) => Math.max(0, i - 1))}
                      style={navBtnStyle("left")}
                    >
                      ‹
                    </button>
                    <button
                      aria-label="Næste billede"
                      onClick={() => setIdx((i) => Math.min(count - 1, i + 1))}
                      style={navBtnStyle("right")}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {count > 1 && (
                <div
                  style={{
                    display: "grid",
                    gridAutoFlow: "column",
                    gap: 8,
                    marginTop: 10,
                    overflowX: "auto",
                    paddingBottom: 2,
                  }}
                >
                  {images.map((src, i) => (
                    <button
                      key={src + i}
                      onClick={() => setIdx(i)}
                      aria-label={`Vælg billede ${i + 1}`}
                      style={{
                        borderRadius: 10,
                        padding: 0,
                        border:
                          i === idx
                            ? "2px solid #1e66ff"
                            : "1px solid #dbe5f1",
                        background: "#fff",
                        width: 92,
                        height: 64,
                        overflow: "hidden",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={src}
                        alt={imageAlts[i] || `Miniature ${i + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tekst */}
          <div
            style={{
              marginTop: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
              fontSize: 16,
            }}
          >
            {text && text.trim().length > 0
              ? text
              : "Der er endnu ikke tilføjet tekst til denne fortælling."}
          </div>

          {/* Lyd (valgfrit) */}
          {audio && (
            <div style={{ marginTop: 12 }}>
              <audio controls src={audio} style={{ width: "100%" }} />
            </div>
          )}
        </div>

        {/* Bunden – valgfri “Luk” (slå til med SHOW_BOTTOM_CLOSE) */}
        {SHOW_BOTTOM_CLOSE && (
          <div
            style={{
              borderTop: "1px solid #e6edf5",
              background: "#fff",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              className="btn"
              style={{ minHeight: 40, padding: "8px 14px" }}
            >
              Luk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function navBtnStyle(side: "left" | "right") {
  return {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 8,
    minWidth: 36,
    minHeight: 36,
    borderRadius: 999,
    border: "1px solid #dbe5f1",
    background: "rgba(255,255,255,.92)",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: 1,
    padding: 0,
  };
}
