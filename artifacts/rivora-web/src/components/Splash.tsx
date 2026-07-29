import { useState } from "react";

const SEEN_KEY = "rivora_seen_splash";

export function Splash() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SEEN_KEY) === "1";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "#0B1220",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 32, textAlign: "center",
      }}
    >
      <img src="/rivora-logo.png" alt="RIVORA EXCHANGE" style={{ width: 200, height: 200, objectFit: "contain", marginBottom: 24 }} />
      <p style={{ color: "#8b95a1", fontSize: 15, lineHeight: 1.7, maxWidth: 340, marginBottom: 40 }}>
        Your trusted investor portal. Trade, invest, and grow your wealth with confidence.
      </p>
      <button
        onClick={handleDismiss}
        style={{
          width: "100%", maxWidth: 280, padding: "14px 0", background: "#00A300", border: "none",
          color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 700,
          letterSpacing: "0.05em", cursor: "pointer",
        }}
      >
        Get Started
      </button>
    </div>
  );
}
