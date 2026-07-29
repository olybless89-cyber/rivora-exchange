import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { X, Gift, CreditCard, Percent, Clock, Trophy, Share2 } from "lucide-react";

const SEEN_KEY = "rivora_seen_welcome_modal";

// Real, currently-enforced platform rules -- kept in one place so this
// modal can never drift from what the backend actually does (see
// artifacts/api-server/src/routes/deposit-requests.ts and
// withdrawal-requests.ts for the source of truth on each of these).
const WELCOME_BONUS = 2_000;
const MIN_DEPOSIT = 20_000;
const WITHDRAWAL_FEE_PERCENT = 20;
const REFERRAL_LEVELS = [
  { level: 1, percent: 20 },
  { level: 2, percent: 2 },
  { level: 3, percent: 2 },
];

export function WelcomeModal() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SEEN_KEY) === "1";
  });

  if (dismissed || !user) return null;

  const handleDismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
  };

  const referralLink = `${window.location.origin}/register?ref=${user.referralCode}`;
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink).then(
      () => toast({ title: "Copied", description: "Referral link copied to clipboard." }),
      () => toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" }),
    );
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 400, maxHeight: "88vh", overflowY: "auto",
          background: "#141414", border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 20, padding: 24,
          boxShadow: "0 0 60px rgba(212,175,55,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700,
            margin: 0, color: "#fff", paddingRight: 12,
          }}>
            Welcome to RIVORA EXCHANGE
          </h2>
          <button
            onClick={handleDismiss}
            aria-label="Close"
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.06)", color: "#9C9C9C", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ color: "#9C9C9C", fontSize: 13, lineHeight: 1.6, margin: "8px 0 22px" }}>
          Your trusted platform for long-term earning opportunities.
        </p>

        <SectionLabel>Platform Highlights</SectionLabel>
        <div style={{ marginBottom: 20 }}>
          <HighlightRow icon={Gift} label="Welcome Bonus" value={`₦${WELCOME_BONUS.toLocaleString()}`} />
          <HighlightRow icon={CreditCard} label="Minimum Deposit" value={`₦${MIN_DEPOSIT.toLocaleString()}`} />
          <HighlightRow icon={Percent} label="Withdrawal Fee" value={`${WITHDRAWAL_FEE_PERCENT}%`} />
          <HighlightRow icon={Clock} label="Withdrawal Hours" value="7:00 PM – 11:00 PM, Mon–Sat" last />
        </div>

        <SectionLabel>Referral Rewards</SectionLabel>
        <div style={{ marginBottom: 18 }}>
          {REFERRAL_LEVELS.map((r, i) => (
            <HighlightRow
              key={r.level}
              icon={Trophy}
              label={`Level ${r.level}`}
              value={`${r.percent}%`}
              last={i === REFERRAL_LEVELS.length - 1}
            />
          ))}
        </div>
        <p style={{ color: "#9C9C9C", fontSize: 12, lineHeight: 1.6, margin: "0 0 20px" }}>
          Earned automatically, straight to your balance, every time someone in your 3-level network gets a deposit approved.
        </p>

        <button
          onClick={copyReferral}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 10, color: "#D4AF37", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20,
          }}
        >
          <Share2 size={15} />
          Copy My Referral Link
        </button>

        <button
          onClick={handleDismiss}
          style={{
            width: "100%", padding: "14px 0",
            background: "linear-gradient(135deg, #E8C874, #D4AF37 45%, #A6821F)", border: "none",
            color: "#0A0A0A", borderRadius: 10, fontSize: 15, fontWeight: 700,
            letterSpacing: "0.03em", cursor: "pointer",
          }}
        >
          Start Investing
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      color: "#D4AF37", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", margin: "0 0 10px",
    }}>
      {children}
    </p>
  );
}

function HighlightRow({
  icon: Icon, label, value, last,
}: {
  icon: any; label: string; value: string; last?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: "rgba(212,175,55,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={14} color="#D4AF37" />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#9C9C9C" }}>{value}</span>
    </div>
  );
}
