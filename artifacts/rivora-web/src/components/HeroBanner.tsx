export function HeroBanner() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        height: 150,
        margin: "0 auto 24px",
        background: "#141414",
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 18,
        padding: "18px 18px 0 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 360 150"
        preserveAspectRatio="none"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0.25, pointerEvents: "none",
        }}
      >
        <path
          d="M -10 110 C 70 90, 120 130, 190 100 S 320 60, 380 75"
          fill="none" stroke="#D4AF37" strokeWidth={1}
        />
      </svg>

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ maxWidth: 210 }}>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
            fontSize: 21, lineHeight: 1.18, color: "#fff", margin: "0 0 8px",
          }}>
            Trade. Invest.<br />Grow.
          </h2>
          <p style={{ fontSize: 12.5, lineHeight: 1.45, color: "#9C9C9C", margin: 0 }}>
            Buy, hold, and grow your digital assets — built for Nigeria.
          </p>
        </div>
        <div style={{
          flexShrink: 0, width: 44, height: 44, borderRadius: 12,
          background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg viewBox="0 0 44 44" fill="none" width={24} height={24}>
            <path
              d="M4 32 C 12 20, 18 30, 22 22 C 26 14, 32 24, 40 12"
              stroke="#D4AF37" strokeWidth={2.5} strokeLinecap="round" fill="none"
            />
          </svg>
        </div>
      </div>

      <div style={{
        position: "absolute", left: 12, bottom: -20, zIndex: 1,
        fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
        fontSize: 52, letterSpacing: "0.01em", color: "transparent",
        WebkitTextStroke: "1px rgba(212,175,55,0.15)", whiteSpace: "nowrap",
      }}>
        RIVORA
      </div>
    </div>
  );
}
