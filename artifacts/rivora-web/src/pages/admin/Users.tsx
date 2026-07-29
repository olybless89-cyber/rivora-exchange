import { useState } from "react";
import { useListUsers, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
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
import { Loader2, Search } from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users, isLoading } = useListUsers({
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as "active" | "inactive" } : {}),
  });

  return (
    <AdminLayout title="Users">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={15} color="#8b95a1" style={{ position: "absolute", left: 12, top: 13 }} />
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

      {isLoading && <p style={{ color: "#8b95a1" }}>Loading users…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(users ?? []).map((u) => (
          <Card key={u.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>
                  {u.fullName}
                  {u.role === "admin" && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#00A300", border: "1px solid #00A300", borderRadius: 6, padding: "1px 6px" }}>ADMIN</span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: "#8b95a1", margin: "3px 0 0" }}>{u.phone}</p>
                <p style={{ fontSize: 12, color: "#8b95a1", margin: "3px 0 0" }}>
                  Balance: {formatNaira(u.balance)} · {" "}
                  <span style={{ color: u.status === "active" ? "#00A300" : "#e31937" }}>{u.status}</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditingUser(u)}>Edit</Button>
            </div>
          </Card>
        ))}
        {!isLoading && (users ?? []).length === 0 && (
          <p style={{ color: "#8b95a1", textAlign: "center", padding: 24 }}>No users found.</p>
        )}
      </div>

      <EditUserDialog user={editingUser} onOpenChange={(open) => !open && setEditingUser(null)} />
    </AdminLayout>
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
