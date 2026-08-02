import { useState } from "react";
import {
  useListWithdrawalRequests,
  useUpdateWithdrawalRequest,
  useListUsers,
  getListWithdrawalRequestsQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, CheckCircle2, XCircle, Clock, Banknote } from "lucide-react";
import type { WithdrawalRequest, User } from "@workspace/api-client-react";

const STATUS_META: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  pending:  { color: "#f59e0b", icon: Clock,        label: "Pending" },
  approved: { color: "#22c55e", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "#ef4444", icon: XCircle,      label: "Rejected" },
};

export default function AdminWithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { data: requests, isLoading } = useListWithdrawalRequests(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "approved" | "rejected" } : undefined,
  );
  const { data: users } = useListUsers();
  const updateRequest = useUpdateWithdrawalRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userName = (userId: string) => users?.find((u: User) => u.id === userId)?.fullName ?? userId;
  const userPhone = (userId: string) => users?.find((u: User) => u.id === userId)?.phone ?? "";

  const allRequests = requests ?? [];
  const pendingCount  = allRequests.filter((r: WithdrawalRequest) => r.status === "pending").length;
  const approvedCount = allRequests.filter((r: WithdrawalRequest) => r.status === "approved").length;
  const rejectedCount = allRequests.filter((r: WithdrawalRequest) => r.status === "rejected").length;

  const review = (id: string, status: "approved" | "rejected") => {
    updateRequest.mutate(
      { requestId: id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWithdrawalRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: status === "approved" ? "✅ Withdrawal approved — deduct from balance" : "Withdrawal rejected — balance refunded" });
        },
        onError: (err: any) => {
          toast({ title: "Action failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout title="Withdrawal Requests">
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Pending",  value: pendingCount,  color: "#f59e0b" },
          { label: "Approved", value: approvedCount, color: "#22c55e" },
          { label: "Rejected", value: rejectedCount, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {pendingCount > 0 && statusFilter === "pending" && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "#f59e0b", margin: 0, fontWeight: 600 }}>
            ⏳ {pendingCount} withdrawal{pendingCount !== 1 ? "s" : ""} awaiting your review
          </p>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 160 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>Loading…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {allRequests.map((r: WithdrawalRequest) => {
          const meta = STATUS_META[r.status] ?? STATUS_META.pending;
          const StatusIcon = meta.icon;
          return (
            <Card key={r.id} style={{ padding: 16, border: r.status === "pending" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#fff" }}>{userName(r.userId)}</p>
                  <p style={{ fontSize: 12, color: "#9C9C9C", margin: "2px 0 0" }}>{userPhone(r.userId)}</p>
                  <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>{format(new Date(r.createdAt), "MMM d, yyyy · h:mm a")}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{formatNaira(r.netAmount)}</p>
                  <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>of {formatNaira(r.amount)} · fee {formatNaira(r.fee)}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                    <StatusIcon size={12} color={meta.color} />
                    <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, textTransform: "uppercase" }}>{meta.label}</span>
                  </div>
                </div>
              </div>

              {/* Bank details */}
              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: r.status === "pending" ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Banknote size={14} color="#9C9C9C" />
                  <div>
                    <p style={{ fontSize: 13, color: "#e8eaec", margin: 0, fontWeight: 600 }}>{r.bankAccountName}</p>
                    <p style={{ fontSize: 12, color: "#9C9C9C", margin: "2px 0 0" }}>{r.bankAccountNumber} · {r.bankName}</p>
                  </div>
                </div>
              </div>

              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" className="flex-1"
                    style={{ background: "#22c55e", color: "#fff", fontWeight: 700 }}
                    onClick={() => review(r.id, "approved")} disabled={updateRequest.isPending}>
                    {updateRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 size={14} style={{ marginRight: 6 }} />Approve & Pay</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1"
                    onClick={() => review(r.id, "rejected")} disabled={updateRequest.isPending}>
                    {updateRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><XCircle size={14} style={{ marginRight: 6 }} />Reject</>}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {!isLoading && allRequests.length === 0 && (
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>No {statusFilter !== "all" ? statusFilter : ""} withdrawal requests found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
