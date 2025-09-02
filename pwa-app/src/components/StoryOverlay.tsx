import type { Poi } from "../lib/data";

type Props = {
  poi: Poi;
  onClose: () => void;
};

export default function StoryOverlay({ poi, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "85vh",
          background: "white",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "16px",
          boxShadow: "0 -8px 24px rgba(0,0,0,.25)",
          overflow: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{poi.title}</h3>
          <button
            onClick={onClose}
            aria-label="Luk"
            style={{
              border: "1px solid #e5e7eb",
              background: "white",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        {/* Billeder kan tilføjes her senere */}
        {/* {poi.images?.length ? (...render billeder...) : null} */}

        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {poi.text}
        </div>

        {/* Lyd (senere): hvis poi.audio findes, vis en <audio controls src={poi.audio} /> */}

      </div>
    </div>
  );
}
