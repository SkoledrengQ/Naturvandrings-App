// src/components/route/ManualStart.tsx
// 1:1 udtræk af din "manuel start"-knap (fixed, centreret over bottombar)

type Props = {
  visible: boolean;
  label: string;       // f.eks. t("run.start", { title: firstPoi?.title ?? "" })
  onStart: () => void; // din onClick-handler
};

export default function ManualStart({ visible, label, onStart }: Props) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 112,
        display: "flex",
        justifyContent: "center",
        zIndex: 60
      }}
    >
      <button
        onClick={onStart}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "#1d4ed8",
          color: "white",
          fontSize: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,.25)"
        }}
      >
        {label}
      </button>
    </div>
  );
}
