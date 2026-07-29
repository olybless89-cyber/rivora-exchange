import { useState } from "react";
import { useListTransactions, useListUsers } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  investment: "Investment",
  bonus: "Bonus",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#C98A2E",
  completed: "#D4AF37",
  rejected: "#C0392B",
};

export default function AdminTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { data: transactions, isLoading } = useListTransactions(
    typeFilter !== "all" ? { type: typeFilter as "deposit" | "withdrawal" | "investment" | "bonus" } : undefined,
  );
  const { data: users } = useListUsers();

  const userName = (userId: string) => users?.find((u) => u.id === userId)?.fullName ?? userId;

  return (
    <AdminLayout title="All Transactions">
      <div style={{ marginBottom: 16 }}>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger style={{ width: 160 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
            <SelectItem value="investment">Investments</SelectItem>
            <SelectItem value="bonus">Bonuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p style={{ color: "#9C9C9C" }}>Loading transactions…</p>}

      <Card style={{ overflow: "hidden" }}>
        {!isLoading && (transactions ?? []).length === 0 && (
          <p style={{ padding: 24, textAlign: "center", color: "#9C9C9C", fontSize: 13, margin: 0 }}>
            No transactions found.
          </p>
        )}
        {(transactions ?? []).map((tx, i, arr) => (
          <div
            key={tx.id}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#fff" }}>{userName(tx.userId)}</p>
              <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>
                {TYPE_LABEL[tx.type] ?? tx.type} · {format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}
              </p>
              <p style={{ fontSize: 10, color: "#9C9C9C", margin: "3px 0 0" }}>Ref: {tx.reference}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: 14, fontWeight: 600, margin: 0,
                color: tx.type === "withdrawal" ? "#C0392B" : "#D4AF37",
              }}>
                {tx.type === "withdrawal" ? "-" : "+"}{formatNaira(tx.amount)}
              </p>
              <p style={{ fontSize: 10, textTransform: "uppercase", margin: "3px 0 0", color: STATUS_COLOR[tx.status] }}>
                {tx.status}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </AdminLayout>
  );
}
