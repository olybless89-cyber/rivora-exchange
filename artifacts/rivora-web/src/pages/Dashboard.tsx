import { Link } from "wouter";
import { useGetMe, useListInvestmentPlans, useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { formatNaira, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

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
  const transactionsParams = user ? { userId: user.id } : undefined;
  const { data: transactions } = useListTransactions(transactionsParams, {
    query: { enabled: !!user, queryKey: getListTransactionsQueryKey(transactionsParams) },
  });
  const { toast } = useToast();

  const recent = (transactions ?? []).slice(0, 5);

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
                <div style={{ display: "flex", gap: 10, overflowX: "auto", marginBottom: 28, paddingBottom: 4 }}>
          {(plans ?? []).slice(0, 6).map((plan) => {
            const dailyIncome = (Number(plan.minAmount) * Number(plan.dailyRate)) / 100;
            return (
              <Card key={plan.id} style={{ minWidth: 150, padding: 14, flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#D4AF37", fontStyle: "italic" }}>{plan.name}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#D4AF37", margin: "6px 0 0" }}>
                  {formatNaira(dailyIncome)}<span style={{ fontSize: 10, color: "#9C9C9C", fontWeight: 400 }}>/day</span>
                </p>
                <p style={{ fontSize: 11, color: "#9C9C9C", margin: "4px 0 0" }}>Min {formatNaira(plan.minAmount)}</p>
              </Card>
            );
          })}
        </div>

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
