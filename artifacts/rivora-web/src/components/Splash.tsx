import { useState, useEffect } from "react";

const SEEN_KEY = "rivora_seen_splash_v3";
const API = (import.meta as any).env?.VITE_API_URL as string ?? "";

const HIGHLIGHTS = [
  { emoji: "🎁", label: "Welcome Bonus",    value: "₦2,000" },
  { emoji: "💳", label: "Minimum Deposit",  value: "₦20,000" },
  { emoji: "📊", label: "Withdrawal Fee",   value: "20%" },
  { emoji: "⏰", label: "Withdrawal Hours", value: "7 PM – 11 PM, Mon–Sat" },
  { emoji: "👥", label: "Support Hours",    value: "8 AM – 6 PM Daily" },
];

const REFERRAL_LEVELS = [
  { emoji: "🥇", label: "Level 1", value: "20%" },
  { emoji: "🥈", label: "Level 2", value: "2%" },
  { emoji: "🥉", label: "Level 3", value: "2%" },
];

export function Splash() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SEEN_KEY) === "1";
  });
  const [waUrl, setWaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (dismissed) return;
    fetch(`${API}/api/settings/whatsapp_url`)
      .then((r) => r.json())
      .then((d) => setWaUrl(d.value ?? null))
      .catch(() => setWaUrl(null));
  }, [dismissed]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "linear-gradient(180deg, #111827 0%, #0b1118 100%)",
        borderRadius: 20,
        border: "1px solid rgba(212,175,55,0.2)",
        maxHeight: "92dvh", overflowY: "auto",
        padding: "28px 22px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.3 }}>
              Welcome to{" "}
              <span style={{ color: "#D4AF37" }}>RIVORA EXCHANGE</span>
            </h2>
            <p style={{ color: "#8a99a8", fontSize: 13, lineHeight: 1.6, margin: "6px 0 0" }}>
              Your trusted platform for long-term earning opportunities.
            </p>
          </div>
          <button onClick={handleDismiss} aria-label="Close" style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "#9C9C9C", cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "18px 0 16px" }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>📌 Platform Highlights</p>
        {HIGHLIGHTS.map((h, i) => (
          <div key={h.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
            borderBottom: i < HIGHLIGHTS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <span style={{ fontSize: 18, width: 26, flexShrink: 0, textAlign: "center" }}>{h.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1 }}>{h.label}:</span>
            <span style={{ fontSize: 13, color: "#8a99a8" }}>{h.value}</span>
          </div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "16px 0" }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>📦 Referral Rewards</p>
        {REFERRAL_LEVELS.map((r, i) => (
          <div key={r.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
            borderBottom: i < REFERRAL_LEVELS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <span style={{ fontSize: 18, width: 26, flexShrink: 0, textAlign: "center" }}>{r.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1 }}>{r.label}:</span>
            <span style={{ fontSize: 13, color: "#8a99a8" }}>{r.value}</span>
          </div>
        ))}
        <p style={{ color: "#8a99a8", fontSize: 12, lineHeight: 1.7, margin: "14px 0 3px" }}>
          🚀 Invite friends, grow your team, and enjoy referral rewards every day.
        </p>
        <p style={{ color: "#8a99a8", fontSize: 12, lineHeight: 1.7, margin: "0 0 22px" }}>
          Thank you for choosing Rivora Exchange. We wish you success on your journey with us!
        </p>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "15px 0", marginBottom: 12,
            background: "#25D366", borderRadius: 14,
            color: "#fff", fontSize: 15, fontWeight: 800,
            textDecoration: "none", letterSpacing: "0.02em",
            boxShadow: "0 4px 20px rgba(37,211,102,0.35)", boxSizing: "border-box",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Join Official Group
          </a>
        )}
        <button onClick={handleDismiss} style={{
          width: "100%", padding: "15px 0",
          background: "linear-gradient(135deg, #E8C874, #D4AF37 45%, #A6821F)",
          border: "none", borderRadius: 14,
          color: "#0A0A0A", fontSize: 15, fontWeight: 800,
          letterSpacing: "0.04em", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(212,175,55,0.3)", boxSizing: "border-box",
        }}>Get Started</button>
      </div>
    </div>
  );
}
