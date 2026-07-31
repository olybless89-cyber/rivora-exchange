import { useListUsers, useListDepositRequests, useListWithdrawalRequests } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Users, Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, Settings, BarChart3 } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: users } = useListUsers();
  const { data: deposits } = useListDepositRequests();
  const { data: withdrawals } = useListWithdrawalRequests();

  const pendingDeposits = deposits?.filter(d => d.status === "pending") ?? [];
  const pendingWithdrawals = withdrawals?.filter(w => w.status === "pending") ?? [];

  const totalUserBalance = users?.reduce((sum, u) => sum + Number(u.balance), 0) ?? 0;

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        <Card style={{ padding: 16, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Users size={24} color="#D4AF37" />
            <div>
              <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>Total Users</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{users?.length ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 16, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Wallet size={24} color="#22c55e" />
            <div>
              <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>Total Balance</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", margin: 0 }}>{formatNaira(totalUserBalance)}</p>
            </div>
          </div>
        </Card>

        <Link to="/admin/deposits" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 16, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ArrowDownCircle size={24} color="#D4AF37" />
              <div>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>Pending Deposits</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{pendingDeposits.length}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/withdrawals" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 16, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ArrowUpCircle size={24} color="#ef4444" />
              <div>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>Pending Withdrawals</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: "#ef4444", margin: 0 }}>{pendingWithdrawals.length}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Quick Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <Link to="/admin/users" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer", transition: "transform 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Manage Users</span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/deposits" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ArrowDownCircle size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Review Deposits</span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/withdrawals" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ArrowUpCircle size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Review Withdrawals</span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/plans" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TrendingUp size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Investment Plans</span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/transactions" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart3 size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Transactions</span>
            </div>
          </Card>
        </Link>

        <Link to="/admin/settings" style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Settings size={20} color="#D4AF37" />
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>Settings</span>
            </div>
          </Card>
        </Link>
      </div>
    </AdminLayout>
  );
}
