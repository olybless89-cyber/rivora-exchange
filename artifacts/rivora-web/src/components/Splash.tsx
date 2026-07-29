import { useState } from "react";

const SEEN_KEY = "rivora_seen_splash_v3";

const HIGHLIGHTS = [
  { emoji: "🎁", label: "Welcome Bonus",    value: "₦2,000" },
  { emoji: "💳", label: "Minimum Deposit",  value: "₦20,000" },
  { emoji: "📊", label: "Withdrawal Fee",   value: "20%" },
  { emoji: "⏰", label: "Withdrawal Hours", value: "7 PM – 11 PM, Mon–Sat" },
  { emoji: "👥", label: "Support Hours",    value: "8 AM – 6 PM Daily" },
];

const REFERRAL_LEVELS = [
  { emoji: "🥇", label: "Level 1", value: "10%" },
  { emoji: "🥈", label: "Level 2", value: "2%" },
  { emoji: "🥉", label: "Level 3", value: "2%" },
];

const TELEGRAM_URL = "https://t.me/+jlGJpM4cdYY5NmRk";

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
    <div style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
      <div style={{ width:"100%",maxWidth:440,background:"linear-gradient(180deg,#111827 0%,#0b1118 100%)",borderRadius:20,border:"1px solid rgba(212,175,55,0.2)",maxHeight:"92dvh",overflowY:"auto",padding:"28px 22px 32px",boxShadow:"0 24px 80px rgba(0,0,0,0.9)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
          <div style={{ flex:1,paddingRight:12 }}>
            <h2 style={{ fontSize:20,fontWeight:800,color:"#fff",margin:0,lineHeight:1.3 }}>
              Welcome to <span style={{ color:"#D4AF37" }}>RIVORA EXCHANGE</span>
            </h2>
            <p style={{ color:"#8a99a8",fontSize:13,lineHeight:1.6,margin:"6px 0 0" }}>Your trusted platform for long-term earning opportunities.</p>
          </div>
          <button onClick={handleDismiss} aria-label="Close" style={{ flexShrink:0,width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:"none",color:"#9C9C9C",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>

        <div style={{ height:1,background:"rgba(255,255,255,0.07)",margin:"18px 0 16px" }} />

        <p style={{ fontSize:13,fontWeight:700,color:"#fff",margin:"0 0 10px" }}>📌 Platform Highlights</p>
        {HIGHLIGHTS.map((h,i) => (
          <div key={h.label} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<HIGHLIGHTS.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
            <span style={{ fontSize:18,width:26,flexShrink:0,textAlign:"center" }}>{h.emoji}</span>
            <span style={{ fontSize:13,fontWeight:700,color:"#fff",flex:1 }}>{h.label}:</span>
            <span style={{ fontSize:13,color:"#8a99a8" }}>{h.value}</span>
          </div>
        ))}

        <div style={{ height:1,background:"rgba(255,255,255,0.07)",margin:"16px 0" }} />

        <p style={{ fontSize:13,fontWeight:700,color:"#fff",margin:"0 0 10px" }}>📦 Referral Rewards</p>
        {REFERRAL_LEVELS.map((r,i) => (
          <div key={r.label} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<REFERRAL_LEVELS.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
            <span style={{ fontSize:18,width:26,flexShrink:0,textAlign:"center" }}>{r.emoji}</span>
            <span style={{ fontSize:13,fontWeight:700,color:"#fff",flex:1 }}>{r.label}:</span>
            <span style={{ fontSize:13,color:"#8a99a8" }}>{r.value}</span>
          </div>
        ))}

        <p style={{ color:"#8a99a8",fontSize:12,lineHeight:1.7,margin:"14px 0 3px" }}>🚀 Invite friends, grow your team, and earn 10% referral bonus every day.</p>
        <p style={{ color:"#D4AF37",fontSize:12,fontWeight:700,lineHeight:1.7,margin:"0 0 22px" }}>⚠️ A referral code is required to register.</p>

        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"15px 0",marginBottom:12,background:"#229ED9",borderRadius:14,color:"#fff",fontSize:15,fontWeight:800,textDecoration:"none",letterSpacing:"0.02em",boxShadow:"0 4px 20px rgba(34,158,217,0.4)",boxSizing:"border-box" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.09 13.89l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.722.696z"/></svg>
          Join Official Telegram Group
        </a>

        <button onClick={handleDismiss} style={{ width:"100%",padding:"15px 0",background:"linear-gradient(135deg,#E8C874,#D4AF37 45%,#A6821F)",border:"none",borderRadius:14,color:"#0A0A0A",fontSize:15,fontWeight:800,letterSpacing:"0.04em",cursor:"pointer",boxShadow:"0 4px 20px rgba(212,175,55,0.3)",boxSizing:"border-box" }}>
          Get Started
        </button>
      </div>
    </div>
  );
}
