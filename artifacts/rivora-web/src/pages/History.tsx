import { useState } from "react";
import { useGetMe, useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  investment: "Investment",
  bonus: "Bonus",
  referral_bonus: "Referral Bonus",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  rejected: "Rejected",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "investment", label: "Investments" },
  { value: "bonus", label: "Bonuses" },
] as const;

export default function HistoryPage() {
  const { data: user } = useGetMe();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const historyParams = user ? { userId: user.id, ...(filter !== "all" ? { type: filter } : {}) } : undefined;
  const { data: transactions, isLoading } = useListTransactions(historyParams, {
    query: { enabled: !!user, queryKey: getListTransactionsQueryKey(historyParams) },
  });

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 16px" }}>Transaction History</h1>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  flexShrink: 0, padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: active ? "1px solid #D4AF37" : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(212,175,55,0.12)" : "transparent",
                  color: active ? "#D4AF37" : "#9C9C9C", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {isLoading && <p style={{ color: "#9C9C9C" }}>Loading transactions…</p>}

        <Card style={{ overflow: "hidden" }}>
          {!isLoading && (transactions ?? []).length === 0 && (
            <p style={{ padding: 24, textAlign: "center", color: "#9C9C9C", fontSize: 13, margin: 0 }}>
              No transactions found.
            </p>
          )}
          {(transactions ?? []).map((tx: any, i: number, arr: any[]) => (
            <div
              key={tx.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#fff" }}>{TYPE_LABEL[tx.type] ?? tx.type}</p>
                <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>
                  {format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}
                </p>
                {tx.description && (
                  <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{tx.description}</p>
                )}
                <p style={{ fontSize: 10, color: "#9C9C9C", margin: "3px 0 0" }}>Ref: {tx.reference}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{
                  fontSize: 14, fontWeight: 600, margin: 0,
                  color: tx.type === "withdrawal" ? "#C0392B" : "#D4AF37",
                }}>
                  {tx.type === "withdrawal" ? "-" : "+"}{formatNaira(tx.amount)}
                </p>
                <p style={{
                  fontSize: 10, margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.04em",
                  color: tx.status === "pending" ? "#C98A2E" : tx.status === "rejected" ? "#C0392B" : "#9C9C9C",
                }}>
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </AppLayout>
  );
}
