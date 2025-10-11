// src/components/route/BottomBar.tsx
type Props = {
  isFirst: boolean;
  isLast: boolean;
  progressText: string;
  canReopen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onFinish?: () => void;
  onReopen?: () => void;
  prevLabel: string;
  nextLabel: string;
  stopLabel: string;
  finishLabel: string;
  reopenLabel: string;
  /** NYT: hvis true, gør Next/Start-knappen blå (primary) */
  nextPrimary?: boolean;
};

export default function BottomBar({
  isFirst,
  isLast,
  progressText,
  canReopen,
  onPrev,
  onNext,
  onStop,
  onFinish,
  onReopen,
  prevLabel,
  nextLabel,
  stopLabel,
  finishLabel,
  reopenLabel,
  nextPrimary = false, // default: grå
}: Props) {
  return (
    <nav
      aria-label="Rutekontrol"
      className="route-bottombar-safe"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70,
        display: "grid", gridTemplateColumns: "auto 1fr", gap: 10,
        alignItems: "center",
        padding: "8px 10px",
        background: "rgba(20,20,20,.95)",
        borderTop: "1px solid rgba(255,255,255,.14)"
      }}
    >
      {!isLast && (
        <button
          onClick={onStop}
          style={{
            minHeight: 44, padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,.18)", background: "#c93a3a", color: "#fff"
          }}
        >
          {stopLabel}
        </button>
      )}

      <div style={{ display: "grid", gridAutoFlow: "column", gap: 8, alignItems: "center", justifyContent: "end" }}>
        {canReopen && (
          <button
            onClick={onReopen}
            style={{
              minHeight: 44,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              background: "transparent",
              color: "#fff",
              opacity: 0.9
            }}
          >
            {reopenLabel}
          </button>
        )}

        {!isFirst && (
          <button
            onClick={onPrev}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)", background: "#1a1a1a", color: "#fff"
            }}
          >
            {prevLabel}
          </button>
        )}

        <div style={{ color: "#cfcfcf", minWidth: 44, textAlign: "center" }}>{progressText}</div>

        {isLast ? (
          <button
            onClick={onFinish ?? onStop}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)", background: "#c93a3a", color: "#fff"
            }}
          >
            {finishLabel}
          </button>
        ) : (
          <button
            onClick={onNext}
            style={{
              minHeight: 44, padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              // ← her skifter vi farve
              background: nextPrimary ? "#1d4ed8" : "#1a1a1a",
              color: "#fff"
            }}
          >
            {nextLabel}
          </button>
        )}
      </div>
    </nav>
  );
}
