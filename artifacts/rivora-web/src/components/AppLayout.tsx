import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Home, TrendingUp, ArrowDownToLine, ArrowUpFromLine, User } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WelcomeModal } from "@/components/WelcomeModal";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/invest", label: "Invest", icon: TrendingUp },
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
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

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: 76 }}>
      <WelcomeModal />
      <div style={{ flex: 1 }}>{children}</div>

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
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: active ? "#D4AF37" : "#9C9C9C", fontSize: 11, textDecoration: "none", flex: 1,
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
