import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Users, ArrowDownToLine, ArrowUpFromLine, LineChart, Receipt, ArrowLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { href: "/admin/plans", label: "Plans", icon: LineChart },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
];

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
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

  if (user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#8b95a1", fontSize: 12, textDecoration: "none", marginBottom: 12 }}>
          <ArrowLeft size={14} />
          Back to app
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px", color: "#fff" }}>{title}</h1>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20,
                fontSize: 12, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap",
                border: active ? "1px solid #00A300" : "1px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(0,163,0,0.12)" : "transparent",
                color: active ? "#00A300" : "#8b95a1",
              }}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: "20px" }}>{children}</div>
    </div>
  );
}
