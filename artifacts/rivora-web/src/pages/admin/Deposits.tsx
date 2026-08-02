import { useState } from "react";
import {
  useListDepositRequests,
  useUpdateDepositRequest,
  useListUsers,
  getListDepositRequestsQueryKey,
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

export default function AdminDepositsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { data: requests, isLoading } = useListDepositRequests(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "approved" | "rejected" } : undefined,
  );
  const { data: users } = useListUsers();
  const updateRequest = useUpdateDepositRequest();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userName = (userId: string) => users?.find((u: any) => u.id === userId)?.fullName ?? userId;

  const review = (id: string, status: "approved" | "rejected") => {
    updateRequest.mutate(
      { requestId: id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDepositRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: status === "approved" ? "Deposit approved" : "Deposit rejected" });
        },
        onError: (err: any) => {
          toast({ title: "Action failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout title="Deposit Requests">
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: r.status === "pending" ? 12 : 0 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>{userName(r.userId)}</p>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: "3px 0 0" }}>{r.paymentMethod}</p>
                <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{format(new Date(r.createdAt), "MMM d, yyyy · h:mm a")}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#D4AF37", margin: 0 }}>{formatNaira(r.amount)}</p>
                <p style={{ fontSize: 10, textTransform: "uppercase", margin: "3px 0 0", color: STATUS_COLOR[r.status] }}>{r.status}</p>
              </div>
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
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 24 }}>No deposit requests found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
