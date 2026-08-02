import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

type DepositRequest = {
  id: string;
  user_id: string;
  tenant_id: string;
  amount: number;
  payment_method: string;
  flw_tx_ref: string | null;
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

export default function AdminDepositsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    let q = (supabase as any)
      .from("deposit_requests")
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
      .channel("deposit_requests_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const review = async (req: DepositRequest, action: "approved" | "rejected") => {
    setProcessingId(req.id);
    try {
      if (action === "approved") {
        // 1. Mark deposit approved
        const { error: dErr } = await (supabase as any)
          .from("deposit_requests")
          .update({ status: "approved", reviewed_at: new Date().toISOString() })
          .eq("id", req.id)
          .eq("status", "pending"); // idempotency guard
        if (dErr) throw dErr;

        // 2. Credit user balance
        const { data: usr } = await (supabase as any)
          .from("users").select("balance, has_received_welcome_bonus").eq("id", req.user_id).maybeSingle();

        // 3. Get tenant welcome_bonus
        const { data: ten } = await (supabase as any)
          .from("tenants").select("welcome_bonus").eq("id", req.tenant_id).maybeSingle();
        const welcomeBonus = (!usr?.has_received_welcome_bonus && ten?.welcome_bonus) ? Number(ten.welcome_bonus) : 0;
        const newBalance = Number(usr?.balance ?? 0) + Number(req.amount) + welcomeBonus;

        await (supabase as any).from("users").update({
          balance: newBalance,
          has_received_welcome_bonus: true,
          updated_at: new Date().toISOString(),
        }).eq("id", req.user_id);

        // 4. Log deposit transaction
        const ref = `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`;
        await (supabase as any).from("transactions").insert({
          tenant_id: req.tenant_id, user_id: req.user_id,
          type: "deposit", amount: req.amount, status: "completed",
          reference: ref, description: `Deposit via ${req.payment_method}`,
        });

        // 5. Welcome bonus transaction if applicable
        if (welcomeBonus > 0) {
          await (supabase as any).from("transactions").insert({
            tenant_id: req.tenant_id, user_id: req.user_id,
            type: "bonus", amount: welcomeBonus, status: "completed",
            reference: `TXN-${crypto.randomUUID().slice(0, 16).toUpperCase()}`,
            description: "Welcome bonus (first deposit)",
          });
        }

        toast({ title: `✅ Deposit approved — ${formatNaira(req.amount)} credited` });
      } else {
        await (supabase as any)
          .from("deposit_requests")
          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
          .eq("id", req.id);
        toast({ title: "Deposit rejected" });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter(r => r.status === "pending");

  return (
    <AdminLayout title="Deposit Requests">
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

      {/* Filter row */}
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

      {pending.length > 0 && statusFilter === "pending" && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#f59e0b", margin: 0, fontWeight: 600 }}>
            ⏳ {pending.length} deposit{pending.length !== 1 ? "s" : ""} awaiting your approval
          </p>
        </div>
      )}

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
                    {r.payment_method} · {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                  {r.flw_tx_ref && (
                    <p style={{ fontSize: 10, color: "#555", margin: "2px 0 0" }}>Ref: {r.flw_tx_ref}</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{formatNaira(r.amount)}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                    <StatusIcon size={12} color={meta.color} />
                    <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, textTransform: "uppercase" }}>{meta.label}</span>
                  </div>
                  {r.reviewed_at && (
                    <p style={{ fontSize: 10, color: "#555", margin: "2px 0 0" }}>
                      Reviewed {format(new Date(r.reviewed_at), "MMM d · h:mm a")}
                    </p>
                  )}
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
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 size={14} style={{ marginRight: 6 }} />Approve</>}
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
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 32 }}>No {statusFilter !== "all" ? statusFilter : ""} deposit requests found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
