import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Home, TrendingUp, Briefcase, ArrowDownToLine, User } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WelcomeModal } from "@/components/WelcomeModal";

const SUPPORT_URL = "https://t.me/+jlGJpM4cdYY5NmRk";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/invest", label: "Invest", icon: TrendingUp },
  { href: "/my-investments", label: "Orders", icon: Briefcase },
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) { setLocation("/login"); return null; }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: 76 }}>
      <WelcomeModal />
      <div style={{ flex: 1 }}>{children}</div>

      {/* Support Care floating button */}
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed", bottom: 88, right: 16, zIndex: 100,
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #229ED9, #1a7db0)",
          borderRadius: 50, padding: "10px 16px",
          color: "#fff", fontSize: 13, fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 4px 20px rgba(34,158,217,0.45)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.09 13.89l-2.956-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.722.696z"/>
        </svg>
        Support
      </a>

      <nav
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430, background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-around", padding: "10px 4px", zIndex: 50,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, color:active?"#D4AF37":"#9C9C9C", fontSize:11, textDecoration:"none", flex:1 }}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
