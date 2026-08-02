import { Link } from "wouter";
import { useGetMe, useListInvestmentPlans, useListTransactions, useListMyReferrals, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { PlanCarousel } from "@/components/PlanCarousel";
import { formatNaira, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, History as HistoryIcon, Users, Copy, CheckCheck, Landmark } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  investment: "Investment",
  bonus: "Bonus",
  referral_bonus: "Referral Bonus",
};

export default function DashboardPage() {
  const { data: user } = useGetMe();
  const { data: plans } = useListInvestmentPlans({ activeOnly: true });
  const { data: referrals } = useListMyReferrals();
  const transactionsParams = user ? { userId: user.id } : undefined;
  const { data: transactions } = useListTransactions(transactionsParams, {
    query: { enabled: !!user, queryKey: getListTransactionsQueryKey(transactionsParams) },
  });
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const recent = (transactions ?? []).slice(0, 5);
  const teamCount = referrals?.length ?? 0;

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <p style={{ color: "#9C9C9C", fontSize: 13, margin: 0 }}>Welcome back,</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, margin: "2px 0 20px" }}>{user?.fullName}</h1>

        <div style={{
          background: "linear-gradient(135deg, #141414, #050505)", border: "1px solid rgba(212,175,55,0.25)",
          borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: "0 0 40px rgba(212,175,55,0.06)",
        }}>
          <p style={{ color: "#9C9C9C", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Total Balance</p>
          <p className="tabular-nums" style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 0", color: "#fff" }}>{formatNaira(user?.balance ?? 0)}</p>
        </div>

        {/* Referral Team Section */}
        <Card style={{ padding: 16, marginBottom: 24, background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={20} color="#D4AF37" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>My Referral Team</span>
              <span style={{ 
                background: "#D4AF37", color: "#000", fontSize: 11, fontWeight: 700, 
                padding: "2px 8px", borderRadius: 12 
              }}>Team ({teamCount})</span>
            </div>
          </div>
          
          <div style={{ 
            background: "#0a0a0a", borderRadius: 8, padding: 12, 
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: 0 }}>Your Referral Code</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#D4AF37", margin: "4px 0 0", letterSpacing: 2 }}>
                {user?.referralCode || "------"}
              </p>
            </div>
            <button
              onClick={copyReferralCode}
              style={{
                background: copied ? "#22c55e" : "#D4AF37",
                border: "none", borderRadius: 8, padding: "10px 14px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}
            >
              {copied ? <CheckCheck size={18} color="#fff" /> : <Copy size={18} color="#000" />}
              <span style={{ fontSize: 12, fontWeight: 600, color: copied ? "#fff" : "#000" }}>
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>
          </div>
          
          <p style={{ fontSize: 11, color: "#9C9C9C", margin: "10px 0 0", textAlign: "center" }}>
            Earn 10% referral bonus when your team deposits!
          </p>
        </Card>

        {/* Accepted Payment Method Notice */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(212,175,55,0.06)",
          border: "1px solid rgba(212,175,55,0.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 20,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(212,175,55,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Landmark size={18} color="#D4AF37" />
          </div>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9C9C9C", margin: 0 }}>
              Accepted Payment Method
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#D4AF37", margin: "2px 0 0" }}>
              Bank Transfer Only
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 28 }}>
          <QuickAction href="/deposit" icon={ArrowDownToLine} label="Deposit" />
          <QuickAction href="/withdraw" icon={ArrowUpFromLine} label="Withdraw" />
          <button
            onClick={() => toast({ title: "Coming soon", description: "Transfers between users aren't available yet." })}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <QuickActionContent icon={ArrowLeftRight} label="Transfer" />
          </button>
          <QuickAction href="/history" icon={HistoryIcon} label="History" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Investment Plans</h2>
          <Link href="/invest" style={{ color: "#D4AF37", fontSize: 12, textDecoration: "none" }}>View all</Link>
        </div>
        <PlanCarousel plans={plans ?? []} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Recent Transactions</h2>
          <Link href="/history" style={{ color: "#D4AF37", fontSize: 12, textDecoration: "none" }}>See all</Link>
        </div>
        <Card style={{ overflow: "hidden" }}>
          {recent.length === 0 && (
            <p style={{ padding: 20, textAlign: "center", color: "#9C9C9C", fontSize: 13, margin: 0 }}>No transactions yet.</p>
          )}
          {recent.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
                borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#fff" }}>{TYPE_LABEL[tx.type] ?? tx.type}</p>
                <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>{format(new Date(tx.createdAt), "MMM d, yyyy")}</p>
              </div>
              <p style={{
                fontSize: 14, fontWeight: 600, margin: 0,
                color: tx.type === "withdrawal" ? "#C0392B" : "#D4AF37",
              }}>
                {tx.type === "withdrawal" ? "-" : "+"}{formatNaira(tx.amount)}
              </p>
            </div>
          ))}
        </Card>
      </div>
    </AppLayout>
  );
}



function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <QuickActionContent icon={Icon} label={label} />
    </Link>
  );
}

function QuickActionContent({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: "#141414", border: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color="#D4AF37" />
      </div>
      <span style={{ fontSize: 11, color: "#e8eaec" }}>{label}</span>
    </div>
  );
}

