import { useState } from "react";
import { useListUsers, useUpdateUser, useListInvestments, getListUsersQueryKey, getListInvestmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { Loader2, Search, ChevronRight, TrendingUp, Wallet, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users, isLoading } = useListUsers({
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as "active" | "inactive" } : {}),
  });

  return (
    <AdminLayout title="Users">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={15} color="#9C9C9C" style={{ position: "absolute", left: 12, top: 13 }} />
          <Input placeholder="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ width: 140 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p style={{ color: "#9C9C9C" }}>Loading users…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(users ?? []).map((u) => (
          <Card key={u.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>
                  {u.fullName}
                  {u.role === "admin" && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#D4AF37", border: "1px solid #D4AF37", borderRadius: 6, padding: "1px 6px" }}>ADMIN</span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: "3px 0 0" }}>{u.phone}</p>
                <p style={{ fontSize: 12, color: "#9C9C9C", margin: "3px 0 0" }}>
                  Balance: {formatNaira(u.balance)} · {" "}
                  <span style={{ color: u.status === "active" ? "#D4AF37" : "#C0392B" }}>{u.status}</span>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="outline" onClick={() => setViewingUser(u)}>
                  View <ChevronRight size={14} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingUser(u)}>Edit</Button>
              </div>
            </div>
          </Card>
        ))}
        {!isLoading && (users ?? []).length === 0 && (
          <p style={{ color: "#9C9C9C", textAlign: "center", padding: 24 }}>No users found.</p>
        )}
      </div>

      <ViewUserDialog user={viewingUser} onOpenChange={(open) => !open && setViewingUser(null)} />
      <EditUserDialog user={editingUser} onOpenChange={(open) => !open && setEditingUser(null)} />
    </AdminLayout>
  );
}

function ViewUserDialog({ user, onOpenChange }: { user: any; onOpenChange: (open: boolean) => void }) {
  const { data: investments, isLoading: loadingInvestments } = useListInvestments(
    user ? { userId: user.id } : undefined
  );

  // Calculate total earnings from investments
  const totalInvested = investments?.reduce((sum, inv) => sum + Number(inv.amount), 0) ?? 0;
  const totalDailyRate = investments?.reduce((sum, inv) => sum + (Number(inv.amount) * Number(inv.dailyRate) / 100), 0) ?? 0;

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent style={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>{user?.fullName}</DialogTitle>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "4px 0 0" }}>{user?.phone}</p>
        </DialogHeader>
        
        {/* User Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <Card style={{ padding: 12, background: "rgba(212,175,55,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Wallet size={16} color="#D4AF37" />
              <span style={{ fontSize: 11, color: "#9C9C9C" }}>Balance</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#D4AF37", margin: 0 }}>{formatNaira(user?.balance)}</p>
          </Card>
          <Card style={{ padding: 12, background: "rgba(34,197,94,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <TrendingUp size={16} color="#22c55e" />
              <span style={{ fontSize: 11, color: "#9C9C9C" }}>Daily Earning</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", margin: 0 }}>{formatNaira(totalDailyRate)}</p>
          </Card>
        </div>

        {/* Investments */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>📊 Investments</h4>
          {loadingInvestments ? (
            <p style={{ color: "#9C9C9C", fontSize: 12 }}>Loading...</p>
          ) : investments && investments.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {investments.map((inv) => (
                <Card key={inv.id} style={{ padding: 12, background: "rgba(0,0,0,0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#D4AF37", margin: 0 }}>{inv.planName}</p>
                      <p style={{ fontSize: 11, color: "#9C9C9C", margin: "2px 0 0" }}>
                        <Calendar size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        {format(new Date(inv.startDate), "MMM d, yyyy")} - {format(new Date(inv.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{formatNaira(inv.amount)}</p>
                      <p style={{ fontSize: 10, color: "#22c55e", margin: "2px 0 0" }}>+{Number(inv.dailyRate)}%/day</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "#9C9C9C" }}>Status</span>
                    <span style={{ fontSize: 11, color: inv.status === "active" ? "#22c55e" : "#9C9C9C", fontWeight: 600 }}>
                      {inv.status.toUpperCase()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p style={{ color: "#9C9C9C", fontSize: 12, textAlign: "center", padding: 12 }}>No investments yet</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onOpenChange }: { user: any; onOpenChange: (open: boolean) => void }) {
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("active");
  const [balance, setBalance] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    if (!user) return;
    const payload: any = { role, status };
    if (balance !== "") payload.balance = Number(balance);
    if (newPassword) payload.newPassword = newPassword;

    updateUser.mutate(
      { userId: user.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "User updated" });
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Update failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => {
        if (open && user) {
          setRole(user.role);
          setStatus(user.status);
          setBalance(String(user.balance));
          setNewPassword("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user?.fullName}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Balance (₦)</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Reset Password (optional)</Label>
            <Input type="text" placeholder="Leave blank to keep current password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
