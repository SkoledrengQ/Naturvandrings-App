export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: "#fee2e2",
      border: "1px solid #ef4444",
      color: "#991b1b",
      padding: "10px 12px",
      borderRadius: 8,
      margin: "8px 0"
    }}>
      {message}
    </div>
  );
}
