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
import { Loader2 } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "#C98A2E",
  approved: "#D4AF37",
  rejected: "#C0392B",
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

  const userName = (userId: string) => users?.find((u: any) => u.id === userId)?.fullName ?? userId;

  const review = (id: string, status: "approved" | "rejected") => {
    updateRequest.mutate(
      { requestId: id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWithdrawalRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: status === "approved" ? "Withdrawal approved" : "Withdrawal rejected" });
        },
        onError: (err: any) => {
          toast({ title: "Action failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout title="Withdrawal Requests">
      <div style={{ marginBottom: 16 }}>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 160 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p style={{ color: "#9C9C9C" }}>Loading requests…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(requests ?? []).map((r: any) => (
          <Card key={r.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>{userName(r.userId)}</p>
                <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{format(new Date(r.createdAt), "MMM d, yyyy · h:mm a")}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#D4AF37", margin: 0 }}>{formatNaira(r.netAmount)}</p>
                <p style={{ fontSize: 10, color: "#9C9C9C", margin: "3px 0 0" }}>of {formatNaira(r.amount)} (fee {formatNaira(r.fee)})</p>
                <p style={{ fontSize: 10, textTransform: "uppercase", margin: "3px 0 0", color: STATUS_COLOR[r.status] }}>{r.status}</p>
              </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 10, marginBottom: r.status === "pending" ? 12 : 0 }}>
              <p style={{ fontSize: 12, color: "#e8eaec", margin: 0 }}>{r.bankName}</p>
              <p style={{ fontSize: 12, color: "#e8eaec", margin: "3px 0 0" }}>{r.bankAccountNumber} · {r.bankAccountName}</p>
            </div>

            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" className="flex-1" onClick={() => review(r.id, "approved")} disabled={updateRequest.isPending}>
                  {updateRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => review(r.id, "rejected")} disabled={updateRequest.isPending}>
                  Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
        {!isLoading && (requests ?? []).length === 0 && (
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 24 }}>No withdrawal requests found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
