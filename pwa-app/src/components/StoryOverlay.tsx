import type { Poi } from "../lib/data";

/** Udvid POI lokalt, så vi kan vise billeder/lyd når de kommer */
type MediaPoi = Poi & {
  text?: string;
  images?: string[];     // fx ["img/poi1a.jpg","img/poi1b.jpg"]
  audio?: string;        // fx "audio/poi1.mp3"
};

type Props = {
  poi: MediaPoi;
  onClose: () => void;
};

export default function StoryOverlay({ poi, onClose }: Props) {
  const { title, text, images, audio } = poi;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 1000,
      }}
    >
      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "85vh",
          background: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: "0 -10px 30px rgba(0,0,0,.25)",
          overflow: "auto",
        }}
      >
        {/* Header-linje */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid #eee",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.25 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Luk"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Billed-galleri (valgfrit) */}
        {images && images.length > 0 && (
          <div
            style={{
              padding: "12px 16px 0",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gap: 10,
                alignItems: "center",
              }}
            >
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  style={{
                    display: "block",
                    height: 160,
                    width: "auto",
                    borderRadius: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tekstindhold */}
        <div style={{ padding: "12px 16px 18px" }}>
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
              fontSize: 16,
              color: "#111",
            }}
          >
            {text && text.trim().length > 0
              ? text
              : "Der er endnu ikke tilføjet tekst til denne fortælling."}
          </div>
        </div>

        {/* Lyd (valgfrit) – vises kun hvis der er en URL */}
        {audio && (
          <div style={{ padding: "0 16px 16px" }}>
            <audio controls src={audio} style={{ width: "100%" }} />
          </div>
        )}
      </div>
    </div>
  );
}
