import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Banknote } from "lucide-react";

type WithdrawalRequest = {
  id: string;
  user_id: string;
  tenant_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  users: { full_name: string; phone: string } | null;
};

const STATUS_META = {
  pending:  { color: "#f59e0b", icon: Clock,         label: "Pending" },
  approved: { color: "#22c55e", icon: CheckCircle2,  label: "Approved" },
  rejected: { color: "#ef4444", icon: XCircle,       label: "Rejected" },
};

export default function AdminWithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    let q = (supabase as any)
      .from("withdrawal_requests")
      .select("*, users(full_name, phone)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setRequests(data ?? []);
    setIsLoading(false);
  }, [statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription for live updates
  useEffect(() => {
    const ch = supabase
      .channel("withdrawal_requests_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const review = async (req: WithdrawalRequest, action: "approved" | "rejected") => {
    setProcessingId(req.id);
    try {
      if (action === "approved") {
        // Mark approved
        const { error: wErr } = await (supabase as any)
          .from("withdrawal_requests")
          .update({ status: "approved", reviewed_at: new Date().toISOString() })
          .eq("id", req.id)
          .eq("status", "pending");
        if (wErr) throw wErr;

        // Update the pending withdrawal transaction to completed
        await (supabase as any)
          .from("transactions")
          .update({ status: "completed" })
          .eq("user_id", req.user_id)
          .eq("type", "withdrawal")
          .eq("status", "pending");

        toast({ title: `✅ Withdrawal approved — pay ${formatNaira(req.net_amount)} to ${req.bank_account_name}` });
      } else {
        // Rejected: refund the deducted balance
        const { data: usr } = await (supabase as any)
          .from("users").select("balance").eq("id", req.user_id).maybeSingle();

        await (supabase as any)
          .from("withdrawal_requests")
          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
          .eq("id", req.id);

        // Refund balance
        await (supabase as any).from("users").update({
          balance: Number(usr?.balance ?? 0) + Number(req.amount),
          updated_at: new Date().toISOString(),
        }).eq("id", req.user_id);

        // Log refund transaction
        await (supabase as any).from("transactions").insert({
          tenant_id: req.tenant_id, user_id: req.user_id,
          type: "deposit", amount: req.amount, status: "completed",
          reference: `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`,
          description: "Withdrawal rejected — balance refunded",
        });

        // Cancel pending withdrawal transaction
        await (supabase as any)
          .from("transactions")
          .update({ status: "cancelled" })
          .eq("user_id", req.user_id)
          .eq("type", "withdrawal")
          .eq("status", "pending");

        toast({ title: "Withdrawal rejected — balance refunded to user" });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout title="Withdrawal Requests">
      {/* Stats bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Pending", value: requests.filter(r => r.status === "pending").length, color: "#f59e0b" },
          { label: "Approved", value: requests.filter(r => r.status === "approved").length, color: "#22c55e" },
          { label: "Rejected", value: requests.filter(r => r.status === "rejected").length, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "#9C9C9C", margin: "3px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); }}>
          <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={load} disabled={isLoading} style={{ marginLeft: "auto", color: "#9C9C9C" }}>
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} style={{ marginRight: 6 }} />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Loader2 size={28} color="#D4AF37" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {requests.map(r => {
          const meta = STATUS_META[r.status] ?? STATUS_META.pending;
          const StatusIcon = meta.icon;
          const isProcessing = processingId === r.id;
          return (
            <Card key={r.id} style={{ padding: 16, border: r.status === "pending" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#fff" }}>
                    {r.users?.full_name ?? "Unknown User"}
                  </p>
                  <p style={{ fontSize: 12, color: "#9C9C9C", margin: "2px 0 0" }}>{r.users?.phone}</p>
                  <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>
                    {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{formatNaira(r.net_amount)}</p>
                  <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>
                    of {formatNaira(r.amount)} · fee {formatNaira(r.fee)}
                  </p>
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
                    <p style={{ fontSize: 13, color: "#e8eaec", margin: 0, fontWeight: 600 }}>{r.bank_account_name}</p>
                    <p style={{ fontSize: 12, color: "#9C9C9C", margin: "2px 0 0" }}>
                      {r.bank_account_number} · {r.bank_name}
                    </p>
                  </div>
                </div>
              </div>

              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    size="sm" className="flex-1"
                    style={{ background: "#22c55e", color: "#fff", fontWeight: 700 }}
                    onClick={() => review(r, "approved")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 size={14} style={{ marginRight: 6 }} />Approve & Pay</>}
                  </Button>
                  <Button
                    size="sm" variant="destructive" className="flex-1"
                    onClick={() => review(r, "rejected")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><XCircle size={14} style={{ marginRight: 6 }} />Reject</>}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {!isLoading && requests.length === 0 && (
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>No {statusFilter !== "all" ? statusFilter : ""} withdrawal requests found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
