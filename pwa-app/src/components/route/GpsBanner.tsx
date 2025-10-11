// src/components/route/GpsBanner.tsx
// 1:1 udtræk af din "GPS-advarsel"-overlay (det mørke toast med knap + iOS-hint).
// Ingen logik ændret — kun flyttet markup.

type Props = {
  visible: boolean;            // svarende til geoError === true
  title: string;               // t("gps.warningTitle")
  message: string;             // t("gps.couldNotGet")
  requestingLabel: string;     // t("gps.requesting") fallback "Beder om lokation…"
  enableLabel: string;         // t("gps.enableBtn")  fallback "Aktivér GPS"
  iosHint?: string | null;     // t("gps.iosHint")
  gpsBtnClicked: boolean;      // styrer om knap + hint skjules efter første klik
  gpsRequesting: boolean;      // disable/opacity for knappen
  isIOS: boolean;              // om vi viser iOS-hint
  onActivate: () => void;      // kaldes når der trykkes på knappen
  onAfterClick: () => void;    // sætter gpsBtnClicked=true i parent
};

export default function GpsBanner({
  visible,
  title,
  message,
  requestingLabel,
  enableLabel,
  iosHint,
  gpsBtnClicked,
  gpsRequesting,
  isIOS,
  onActivate,
  onAfterClick,
}: Props) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        top: "calc(var(--headerH, 76px) + 8px)",
        zIndex: 80,
        maxWidth: "min(720px, calc(100vw - 24px))",
        background: "rgba(0,0,0,.65)",
        border: "1px solid rgba(255,200,0,.55)",
        color: "#fff",
        padding: "10px 12px",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        gap: 10
      }}
    >
      <div>
        <strong>{title}</strong>: {message}
      </div>

      {/* Samme adfærd: vis "Aktivér GPS" kun indtil første klik */}
      {!gpsBtnClicked && (
        <button
          onClick={() => {
            onAfterClick();     // setGpsBtnClicked(true)
            onActivate();       // requestGpsPermissionOnce()
          }}
          disabled={gpsRequesting}
          style={{
            marginLeft: 8,
            minHeight: 32,
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            background: "#1e66ff",
            color: "#fff",
            cursor: gpsRequesting ? "default" : "pointer",
            opacity: gpsRequesting ? 0.8 : 1
          }}
        >
          {gpsRequesting ? (requestingLabel || "Beder om lokation…")
                         : (enableLabel     || "Aktivér GPS")}
        </button>
      )}

      {isIOS && !gpsBtnClicked && iosHint ? (
        <small style={{ opacity: 0.9 }}>{iosHint}</small>
      ) : null}
    </div>
  );
}
